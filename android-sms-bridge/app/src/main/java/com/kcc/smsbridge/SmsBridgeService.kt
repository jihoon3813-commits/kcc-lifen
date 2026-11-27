package com.kcc.smsbridge

import android.Manifest
import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.database.ContentObserver
import android.net.ConnectivityManager
import android.net.Network
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.telephony.SmsManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.util.UUID
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

class SmsBridgeService : Service() {

    companion object {
        private const val CHANNEL_ID = "kcc_sms_bridge_channel"
        private const val NOTIF_ID = 2001
        private const val ACTION_START = "com.kcc.smsbridge.ACTION_START"
        private const val ACTION_STOP = "com.kcc.smsbridge.ACTION_STOP"
        private const val ACTION_NUDGE = "com.kcc.smsbridge.ACTION_NUDGE"
        private const val ACTION_IMMEDIATE_INBOUND = "com.kcc.smsbridge.ACTION_IMMEDIATE_INBOUND"
        private const val EXTRA_PHONE = "extra_phone"
        private const val EXTRA_BODY = "extra_body"

        fun start(context: Context) {
            val intent = Intent(context, SmsBridgeService::class.java).apply {
                action = ACTION_START
            }
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, SmsBridgeService::class.java).apply {
                action = ACTION_STOP
            }
            context.stopService(intent)
        }

        fun nudgeSync(context: Context) {
            if (!BridgePrefs.isEnabled(context)) return
            try {
                val intent = Intent(context, SmsBridgeService::class.java).apply {
                    action = ACTION_NUDGE
                }
                ContextCompat.startForegroundService(context, intent)
            } catch (_: Exception) {
            }
        }

        fun enqueueImmediateInbound(context: Context, phone: String, body: String) {
            if (!BridgePrefs.isEnabled(context)) return
            try {
                val intent = Intent(context, SmsBridgeService::class.java).apply {
                    action = ACTION_IMMEDIATE_INBOUND
                    putExtra(EXTRA_PHONE, phone)
                    putExtra(EXTRA_BODY, body)
                }
                ContextCompat.startForegroundService(context, intent)
            } catch (_: Exception) {
            }
        }
    }

    @Volatile
    private var executor: ScheduledExecutorService? = null
    private val isTickRunning = AtomicBoolean(false)
    private val lastTickStartedAt = AtomicLong(0L)
    private val immediateInboundQueue = ConcurrentLinkedQueue<SyncItem>()
    private var smsObserver: ContentObserver? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var cpuWakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private val nudgeRunnable = Runnable { triggerImmediateTick() }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startAsForeground("KCC 어드민 서버와 상시 연결 중...")
        ensureKeepAliveLocks()
        SmsMmsScanner.ensureBaselineInitialized(this)
        registerSmsContentObserver()
        registerNetworkCallback()
        startWorkerLoop()
        WatchdogReceiver.scheduleNext(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                BridgePrefs.setEnabled(this, false)
                BridgePrefs.setStatusText(this, "중지됨")
                BridgePrefs.appendLog(this, "사용자에 의해 연동이 중지되었습니다.")
                WatchdogReceiver.cancel(this)
                releaseKeepAliveLocks()
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_IMMEDIATE_INBOUND -> {
                ensureKeepAliveLocks()
                WatchdogReceiver.scheduleNext(this)
                val phone = intent.getStringExtra(EXTRA_PHONE) ?: ""
                val body = intent.getStringExtra(EXTRA_BODY) ?: ""
                if (phone.isNotBlank() && body.isNotBlank()) {
                    immediateInboundQueue.add(
                        SyncItem(
                            direction = "inbound",
                            phone = phone,
                            message = body,
                            timestamp = System.currentTimeMillis()
                        )
                    )
                }
                recoverStuckExecutorIfNeeded()
                triggerImmediateTick()
            }
            ACTION_NUDGE, ACTION_START, null -> {
                if (BridgePrefs.isEnabled(this)) {
                    ensureKeepAliveLocks()
                    WatchdogReceiver.scheduleNext(this)
                    recoverStuckExecutorIfNeeded()
                    triggerImmediateTick()
                }
            }
        }
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        if (BridgePrefs.isEnabled(this)) {
            WatchdogReceiver.scheduleNext(this, 1_500L)
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onTimeout(startId: Int) {
        if (BridgePrefs.isEnabled(this)) {
            WatchdogReceiver.scheduleNext(this, 1_500L)
        }
        stopSelf(startId)
    }

    override fun onDestroy() {
        mainHandler.removeCallbacks(nudgeRunnable)
        unregisterSmsContentObserver()
        unregisterNetworkCallback()
        executor?.shutdownNow()
        executor = null
        releaseKeepAliveLocks()
        if (BridgePrefs.isEnabled(this)) {
            WatchdogReceiver.scheduleNext(this, 2_000L)
        }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    @Synchronized
    private fun ensureKeepAliveLocks() {
        try {
            if (cpuWakeLock == null) {
                val pm = getSystemService(PowerManager::class.java)
                cpuWakeLock = pm?.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "kcc:SmsBridgeCpuLock"
                )?.apply {
                    setReferenceCounted(false)
                }
            }
            if (cpuWakeLock?.isHeld != true) {
                cpuWakeLock?.acquire()
            }
        } catch (e: Exception) {
            BridgePrefs.appendLog(this, "WakeLock 획득 경고: ${e.message}")
        }

        try {
            if (wifiLock == null) {
                val wm = applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    WifiManager.WIFI_MODE_FULL_LOW_LATENCY
                } else {
                    @Suppress("DEPRECATION")
                    WifiManager.WIFI_MODE_FULL_HIGH_PERF
                }
                wifiLock = wm?.createWifiLock(mode, "kcc:SmsBridgeWifiLock")?.apply {
                    setReferenceCounted(false)
                }
            }
            if (wifiLock?.isHeld != true) {
                wifiLock?.acquire()
            }
        } catch (_: Exception) {
        }
    }

    @Synchronized
    private fun releaseKeepAliveLocks() {
        runCatching {
            if (cpuWakeLock?.isHeld == true) cpuWakeLock?.release()
        }
        cpuWakeLock = null

        runCatching {
            if (wifiLock?.isHeld == true) wifiLock?.release()
        }
        wifiLock = null
    }

    @Synchronized
    private fun startWorkerLoop() {
        val current = executor
        if (current != null && !current.isShutdown) return
        val exec = Executors.newSingleThreadScheduledExecutor()
        executor = exec
        exec.scheduleWithFixedDelay(
            { runTickSafely() },
            0L,
            3L,
            TimeUnit.SECONDS
        )
    }

    @Synchronized
    private fun recoverStuckExecutorIfNeeded() {
        val started = lastTickStartedAt.get()
        if (isTickRunning.get() && started > 0L && System.currentTimeMillis() - started > 75_000L) {
            BridgePrefs.appendLog(this, "[자동복구] 지연된 네트워크 스레드를 재시작합니다.")
            runCatching { executor?.shutdownNow() }
            executor = null
            isTickRunning.set(false)
            lastTickStartedAt.set(0L)
            startWorkerLoop()
        } else if (executor == null || executor?.isShutdown == true) {
            startWorkerLoop()
        }
    }

    private fun triggerImmediateTick() {
        val exec = executor
        if (exec == null || exec.isShutdown) {
            startWorkerLoop()
            return
        }
        runCatching { exec.execute { runTickSafely() } }
    }

    private fun registerNetworkCallback() {
        if (networkCallback != null) return
        val cm = getSystemService(ConnectivityManager::class.java) ?: return
        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                super.onAvailable(network)
                if (BridgePrefs.isEnabled(this@SmsBridgeService)) {
                    triggerImmediateTick()
                }
            }
        }
        runCatching {
            cm.registerDefaultNetworkCallback(cb)
            networkCallback = cb
        }
    }

    private fun unregisterNetworkCallback() {
        val cb = networkCallback ?: return
        val cm = getSystemService(ConnectivityManager::class.java)
        runCatching { cm?.unregisterNetworkCallback(cb) }
        networkCallback = null
    }

    private fun registerSmsContentObserver() {
        if (smsObserver != null) return
        val observer = object : ContentObserver(mainHandler) {
            override fun onChange(selfChange: Boolean, uri: Uri?) {
                super.onChange(selfChange, uri)
                mainHandler.removeCallbacks(nudgeRunnable)
                mainHandler.postDelayed(nudgeRunnable, 900L)
            }
        }
        try {
            contentResolver.registerContentObserver(Uri.parse("content://sms"), true, observer)
            contentResolver.registerContentObserver(Uri.parse("content://mms-sms/"), true, observer)
            smsObserver = observer
        } catch (e: Exception) {
            BridgePrefs.appendLog(this, "문자함 감지 등록 실패(권한 확인 필요): ${e.message}")
        }
    }

    private fun unregisterSmsContentObserver() {
        smsObserver?.let {
            runCatching { contentResolver.unregisterContentObserver(it) }
        }
        smsObserver = null
    }

    private fun resolveTargetServer(
        item: SyncItem,
        servers: List<BridgeServerConfig>
    ): BridgeServerConfig? {
        if (servers.isEmpty()) return null
        val normPhone = SmsMmsScanner.normalizePhone(item.phone)
        val cutoff = item.timestamp + 15_000L

        var bestServer: BridgeServerConfig? = null
        var bestServerTime = 0L

        for (srv in servers) {
            val t = BridgePrefs.getLatestOutboundTimestamp(this, srv.url, normPhone, cutoff)
            if (t > bestServerTime) {
                bestServerTime = t
                bestServer = srv
            }
        }

        if (item.direction == "inbound" && normPhone.length >= 9) {
            val tExternalCached = BridgePrefs.getLatestOutboundTimestamp(
                this,
                BridgePrefs.EXTERNAL_OWNER,
                normPhone,
                cutoff
            )
            val tExternalQuery = SmsMmsScanner.findLatestHyowonOutboundAt(this, normPhone, cutoff)
            val tExternal = maxOf(tExternalCached, tExternalQuery)
            if (tExternal > 0L && tExternal > bestServerTime) {
                BridgePrefs.appendLog(this, "[수신 제외] 타사(효원) 발신 답장 분리: $normPhone")
                return null
            }
        }

        return bestServer ?: servers.first()
    }

    private fun runTickSafely() {
        if (!BridgePrefs.isEnabled(this)) return
        if (!isTickRunning.compareAndSet(false, true)) return
        lastTickStartedAt.set(System.currentTimeMillis())

        try {
            ensureKeepAliveLocks()

            val servers = BridgePrefs.getConfiguredServers(this)
            if (servers.isEmpty()) {
                BridgePrefs.setStatusText(this, "설정 필요 (서버주소/보안키)")
                return
            }

            val deviceName = "${Build.MANUFACTURER} ${Build.MODEL}".trim()
            val primary = servers.first()

            // 0. 미전송된 ACK 재전송
            val pendingAcks = BridgePrefs.getPendingAcks(this)
            for (item in pendingAcks) {
                val targetUrl = item.serverUrl.ifBlank { primary.url }
                val targetSecret = item.secret.ifBlank {
                    servers.firstOrNull { it.url == targetUrl }?.secret ?: primary.secret
                }
                val acked = runCatching {
                    BridgeApiClient.ack(targetUrl, targetSecret, item.outboxId, item.success, item.errorMessage)
                }.getOrDefault(false)
                if (acked) {
                    BridgePrefs.removePendingAck(this, item.outboxId, item.serverUrl)
                }
            }

            // 1. 설정된 모든 어드민 서버(운영 / 선택적 개발) 폴링 및 발송 큐 처리
            val connectedLabels = mutableListOf<String>()
            var lastPollErr: String? = null

            for (srv in servers) {
                val pollRes = runCatching {
                    BridgeApiClient.poll(srv.url, srv.secret, deviceName)
                }.getOrElse {
                    PollResponse(ok = false, error = it.message ?: "네트워크 오류", jobs = emptyList())
                }

                if (!pollRes.ok) {
                    lastPollErr = "${srv.label}: ${pollRes.error ?: "연결 실패"}"
                    continue
                }

                connectedLabels.add(srv.label)
                BridgePrefs.mergeServerOutbounds(this, srv.url, pollRes.recentOutbounds, pollRes.serverNow)

                for (job in pollRes.jobs) {
                    if (BridgePrefs.wasOutboxSent(this, job.outboxId)) {
                        val reAcked = runCatching {
                            BridgeApiClient.ack(srv.url, srv.secret, job.outboxId, true, null)
                        }.getOrDefault(false)
                        if (!reAcked) {
                            BridgePrefs.enqueuePendingAck(
                                this,
                                PendingAckItem(job.outboxId, true, null, srv.url, srv.secret)
                            )
                        }
                        continue
                    }

                    SmsMmsScanner.recordBridgeDispatch(srv.url, job.receiverPhone, job.message)
                    BridgePrefs.recordOutboundTimestamp(
                        this,
                        srv.url,
                        job.receiverPhone,
                        System.currentTimeMillis()
                    )

                    val (sentOk, errText) = sendSmsViaSim(job.receiverPhone, job.message)
                    if (sentOk) {
                        BridgePrefs.markOutboxSent(this, job.outboxId)
                    }

                    val ackOk = runCatching {
                        BridgeApiClient.ack(srv.url, srv.secret, job.outboxId, sentOk, errText)
                    }.getOrDefault(false)

                    if (!ackOk) {
                        BridgePrefs.enqueuePendingAck(
                            this,
                            PendingAckItem(job.outboxId, sentOk, errText, srv.url, srv.secret)
                        )
                    }

                    if (sentOk) {
                        BridgePrefs.appendLog(this, "[${srv.label} 발송완료] ${job.receiverPhone} (${job.message.length}자)")
                    } else {
                        BridgePrefs.appendLog(this, "[${srv.label} 발송실패] ${job.receiverPhone}: $errText")
                    }
                }
            }

            if (connectedLabels.isEmpty()) {
                val errMsg = lastPollErr ?: "연결 실패"
                BridgePrefs.setStatusText(this, "연결 오류: $errMsg")
                updateNotification("연결 확인 필요: $errMsg")
                return
            }

            val connSummary = connectedLabels.joinToString("·")
            BridgePrefs.setStatusText(this, "$connSummary 실시간 연결됨 ($deviceName)")
            updateNotification("KCC($connSummary) 24시간 상시 동기화 중 (v${BridgePrefs.APP_VERSION})")

            // 2. 즉시 수신 큐 + 문자함(SMS/LMS) 증분 스캔 동기화
            val immediateItems = mutableListOf<SyncItem>()
            while (true) {
                val item = immediateInboundQueue.poll() ?: break
                immediateItems.add(item)
            }

            val hasReadPerm = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.READ_SMS
            ) == PackageManager.PERMISSION_GRANTED

            val scanBatch = if (hasReadPerm) {
                SmsMmsScanner.collectNewMessages(this)
            } else {
                null
            }

            val combined = mutableListOf<SyncItem>()
            combined.addAll(immediateItems)
            if (scanBatch != null) {
                for (scanned in scanBatch.items) {
                    val alreadyInImmediate = immediateItems.any {
                        it.direction == scanned.direction &&
                            SmsMmsScanner.normalizePhone(it.phone) == SmsMmsScanner.normalizePhone(scanned.phone) &&
                            it.message.trim() == scanned.message.trim()
                    }
                    if (!alreadyInImmediate) {
                        combined.add(scanned)
                    }
                }
            }

            if (combined.isNotEmpty()) {
                val grouped = LinkedHashMap<BridgeServerConfig, MutableList<SyncItem>>()
                for (item in combined) {
                    if (item.direction == "outbound" &&
                        (SmsMmsScanner.isHyowonMessage(item.message) ||
                            SmsMmsScanner.wasDispatchedByBridge(item.phone, item.message))
                    ) {
                        if (SmsMmsScanner.isHyowonMessage(item.message)) {
                            BridgePrefs.recordOutboundTimestamp(
                                this,
                                BridgePrefs.EXTERNAL_OWNER,
                                item.phone,
                                item.timestamp
                            )
                        }
                        continue
                    }

                    val target = resolveTargetServer(item, servers) ?: continue
                    grouped.getOrPut(target) { mutableListOf() }.add(item)
                }

                var allSyncSucceeded = true
                for ((srv, batch) in grouped) {
                    if (batch.isEmpty()) continue
                    val syncRes = runCatching {
                        BridgeApiClient.sync(srv.url, srv.secret, deviceName, batch)
                    }.getOrElse {
                        SyncResponse(ok = false, synced = 0, error = it.message ?: "동기화 오류")
                    }
                    if (syncRes.ok) {
                        if (syncRes.synced > 0) {
                            BridgePrefs.appendLog(this, "[${srv.label} 동기화] 고객 문자 ${syncRes.synced}건 반영")
                        }
                    } else {
                        allSyncSucceeded = false
                        BridgePrefs.appendLog(this, "[${srv.label} 동기화 재시도] ${syncRes.error}")
                    }
                }

                if (allSyncSucceeded && scanBatch != null) {
                    BridgePrefs.setLastSmsId(this, scanBatch.nextSmsId)
                    BridgePrefs.setLastMmsId(this, scanBatch.nextMmsId)
                }
            } else if (scanBatch != null) {
                BridgePrefs.setLastSmsId(this, scanBatch.nextSmsId)
                BridgePrefs.setLastMmsId(this, scanBatch.nextMmsId)
            }
        } catch (_: Exception) {
            BridgePrefs.setStatusText(this, "네트워크 재연결 대기 중")
        } finally {
            lastTickStartedAt.set(0L)
            isTickRunning.set(false)
        }
    }

    private fun sendSmsViaSim(rawPhone: String, message: String): Pair<Boolean, String?> {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            return Pair(false, "앱에 문자 발송(SEND_SMS) 권한이 없습니다.")
        }

        val phone = SmsMmsScanner.normalizePhone(rawPhone)
        if (phone.length < 9) {
            return Pair(false, "유효하지 않은 전화번호: $rawPhone")
        }

        val smsManager: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            getSystemService(SmsManager::class.java) ?: run {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }
        } else {
            @Suppress("DEPRECATION")
            SmsManager.getDefault()
        }

        val parts = smsManager.divideMessage(message)
        if (parts.isEmpty()) {
            return Pair(false, "빈 문자 내용")
        }

        val actionName = "com.kcc.smsbridge.SMS_SENT_${UUID.randomUUID()}"
        val latch = CountDownLatch(parts.size)
        var anyError: String? = null

        val sentReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (resultCode != Activity.RESULT_OK) {
                    anyError = "통신사 전송 오류 (코드: $resultCode)"
                }
                latch.countDown()
            }
        }

        ContextCompat.registerReceiver(
            this,
            sentReceiver,
            IntentFilter(actionName),
            ContextCompat.RECEIVER_EXPORTED
        )

        return try {
            if (parts.size == 1) {
                val pi = PendingIntent.getBroadcast(
                    this,
                    0,
                    Intent(actionName).setPackage(packageName),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                smsManager.sendTextMessage(phone, null, message, pi, null)
            } else {
                val sentIntents = ArrayList<PendingIntent>(parts.size)
                for (i in parts.indices) {
                    val pi = PendingIntent.getBroadcast(
                        this,
                        i,
                        Intent(actionName).setPackage(packageName),
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    sentIntents.add(pi)
                }
                smsManager.sendMultipartTextMessage(phone, null, parts, sentIntents, null)
            }

            val completed = latch.await(25L, TimeUnit.SECONDS)
            if (!completed) {
                Pair(true, null)
            } else if (anyError != null) {
                Pair(false, anyError)
            } else {
                Pair(true, null)
            }
        } catch (e: Exception) {
            Pair(false, e.message ?: "문자 발송 예외 발생")
        } finally {
            runCatching { unregisterReceiver(sentReceiver) }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "KCC 문자 연동 상태",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "KCC홈씨씨 어드민과 회사폰 문자를 실시간으로 연동합니다."
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(contentText: String): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pi = PendingIntent.getActivity(
            this,
            1,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.sym_action_chat)
            .setContentTitle("KCC 문자연동 상시 가동 중")
            .setContentText(contentText)
            .setContentIntent(pi)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun startAsForeground(contentText: String) {
        val notif = buildNotification(contentText)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIF_ID, notif)
        }
    }

    private fun updateNotification(contentText: String) {
        val nm = getSystemService(NotificationManager::class.java) ?: return
        nm.notify(NOTIF_ID, buildNotification(contentText))
    }
}
