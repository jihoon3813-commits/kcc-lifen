package com.kcc.smsbridge

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class BridgeServerConfig(
    val label: String,
    val url: String,
    val secret: String,
    val isPrimary: Boolean
)

data class PendingAckItem(
    val outboxId: String,
    val success: Boolean,
    val errorMessage: String?,
    val serverUrl: String = "",
    val secret: String = ""
)

object BridgePrefs {
    const val APP_VERSION = "1.2.0"

    private const val PREF_NAME = "kcc_sms_bridge_prefs"
    const val KEY_SERVER_URL = "server_url"
    const val KEY_SECRET = "secret"
    const val KEY_DEV_SERVER_URL = "dev_server_url"
    const val KEY_DEV_SECRET = "dev_secret"
    const val KEY_ENABLED = "enabled"
    const val KEY_LAST_SMS_ID = "last_sms_id"
    const val KEY_LAST_MMS_ID = "last_mms_id"
    const val KEY_LOGS = "activity_logs"
    const val KEY_STATUS_TEXT = "status_text"
    private const val KEY_SENT_OUTBOX_IDS = "sent_outbox_ids"
    private const val KEY_PENDING_ACKS = "pending_acks_json"
    private const val KEY_OUTBOUND_TIMESTAMPS = "outbound_timestamps_json"

    const val DEFAULT_SERVER_URL = "https://resolute-orca-48.convex.site"
    const val DEFAULT_DEV_SERVER_URL = "https://successful-marmot-772.convex.site"
    const val EXTERNAL_OWNER = "__external_hyowon__"

    private var outboundCacheLoaded = false
    private val outboundCache = HashMap<String, HashMap<String, Long>>()

    fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    fun getServerUrl(context: Context): String {
        val raw = prefs(context).getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
        return raw.trim().trimEnd('/')
    }

    fun getSecret(context: Context): String =
        (prefs(context).getString(KEY_SECRET, "") ?: "").trim()

    fun getDevServerUrl(context: Context): String =
        (prefs(context).getString(KEY_DEV_SERVER_URL, "") ?: "").trim().trimEnd('/')

    fun getDevSecret(context: Context): String =
        (prefs(context).getString(KEY_DEV_SECRET, "") ?: "").trim()

    fun saveConfig(
        context: Context,
        serverUrl: String,
        secret: String,
        devServerUrl: String = "",
        devSecret: String = ""
    ) {
        prefs(context).edit()
            .putString(KEY_SERVER_URL, serverUrl.trim().trimEnd('/'))
            .putString(KEY_SECRET, secret.trim())
            .putString(KEY_DEV_SERVER_URL, devServerUrl.trim().trimEnd('/'))
            .putString(KEY_DEV_SECRET, devSecret.trim())
            .apply()
    }

    fun getConfiguredServers(context: Context): List<BridgeServerConfig> {
        val list = mutableListOf<BridgeServerConfig>()
        val primaryUrl = getServerUrl(context)
        val primarySecret = getSecret(context)
        if (primaryUrl.isNotBlank() && primarySecret.isNotBlank()) {
            list.add(
                BridgeServerConfig(
                    label = "운영",
                    url = primaryUrl,
                    secret = primarySecret,
                    isPrimary = true
                )
            )
        }
        val devUrl = getDevServerUrl(context)
        val devSecret = getDevSecret(context)
        if (devUrl.isNotBlank() && devSecret.isNotBlank() && devUrl != primaryUrl) {
            list.add(
                BridgeServerConfig(
                    label = "개발",
                    url = devUrl,
                    secret = devSecret,
                    isPrimary = false
                )
            )
        }
        return list
    }

    fun isEnabled(context: Context): Boolean =
        prefs(context).getBoolean(KEY_ENABLED, false)

    fun setEnabled(context: Context, enabled: Boolean) {
        prefs(context).edit().putBoolean(KEY_ENABLED, enabled).apply()
    }

    fun getLastSmsId(context: Context): Long =
        prefs(context).getLong(KEY_LAST_SMS_ID, -1L)

    fun setLastSmsId(context: Context, id: Long) {
        prefs(context).edit().putLong(KEY_LAST_SMS_ID, id).apply()
    }

    fun getLastMmsId(context: Context): Long =
        prefs(context).getLong(KEY_LAST_MMS_ID, -1L)

    fun setLastMmsId(context: Context, id: Long) {
        prefs(context).edit().putLong(KEY_LAST_MMS_ID, id).apply()
    }

    fun setStatusText(context: Context, status: String) {
        prefs(context).edit().putString(KEY_STATUS_TEXT, status).apply()
    }

    fun getStatusText(context: Context): String =
        prefs(context).getString(KEY_STATUS_TEXT, "대기 중") ?: "대기 중"

    @Synchronized
    fun wasOutboxSent(context: Context, outboxId: String): Boolean {
        if (outboxId.isBlank()) return false
        val raw = prefs(context).getString(KEY_SENT_OUTBOX_IDS, "") ?: ""
        if (raw.isBlank()) return false
        return raw.split(",").any { it == outboxId }
    }

    @Synchronized
    fun markOutboxSent(context: Context, outboxId: String) {
        if (outboxId.isBlank()) return
        val raw = prefs(context).getString(KEY_SENT_OUTBOX_IDS, "") ?: ""
        val existing = if (raw.isBlank()) emptyList() else raw.split(",").filter { it.isNotBlank() && it != outboxId }
        val updated = (existing + outboxId).takeLast(120).joinToString(",")
        prefs(context).edit().putString(KEY_SENT_OUTBOX_IDS, updated).apply()
    }

    @Synchronized
    private fun ensureOutboundCacheLoaded(context: Context) {
        if (outboundCacheLoaded) return
        outboundCacheLoaded = true
        val raw = prefs(context).getString(KEY_OUTBOUND_TIMESTAMPS, "") ?: ""
        if (raw.isBlank()) return
        runCatching {
            val root = JSONObject(raw)
            val owners = root.keys()
            while (owners.hasNext()) {
                val owner = owners.next()
                val inner = root.optJSONObject(owner) ?: continue
                val map = HashMap<String, Long>()
                val phones = inner.keys()
                while (phones.hasNext()) {
                    val phone = phones.next()
                    val ts = inner.optLong(phone, 0L)
                    if (ts > 0L) map[phone] = ts
                }
                outboundCache[owner] = map
            }
        }
    }

    @Synchronized
    private fun persistOutboundCache(context: Context) {
        val root = JSONObject()
        for ((owner, map) in outboundCache) {
            if (map.size > 300) {
                val trimmed = map.entries.sortedByDescending { it.value }.take(250)
                map.clear()
                for (e in trimmed) {
                    map[e.key] = e.value
                }
            }
            val inner = JSONObject()
            for ((phone, ts) in map) {
                inner.put(phone, ts)
            }
            root.put(owner, inner)
        }
        prefs(context).edit().putString(KEY_OUTBOUND_TIMESTAMPS, root.toString()).apply()
    }

    @Synchronized
    fun recordOutboundTimestamp(
        context: Context,
        ownerKey: String,
        rawPhone: String,
        timestampMs: Long
    ) {
        val norm = SmsMmsScanner.normalizePhone(rawPhone)
        if (ownerKey.isBlank() || norm.length < 9 || timestampMs <= 0L) return
        ensureOutboundCacheLoaded(context)
        val map = outboundCache.getOrPut(ownerKey) { HashMap() }
        val prev = map[norm] ?: 0L
        if (timestampMs > prev) {
            map[norm] = timestampMs
            persistOutboundCache(context)
        }
    }

    @Synchronized
    fun mergeServerOutbounds(
        context: Context,
        ownerKey: String,
        items: List<RecentOutbound>,
        serverNowMs: Long
    ) {
        if (ownerKey.isBlank() || items.isEmpty()) return
        ensureOutboundCacheLoaded(context)
        val clockOffset = if (serverNowMs > 0L) System.currentTimeMillis() - serverNowMs else 0L
        val map = outboundCache.getOrPut(ownerKey) { HashMap() }
        var changed = false
        for (item in items) {
            val norm = SmsMmsScanner.normalizePhone(item.phone)
            if (norm.length < 9 || item.sentAt <= 0L) continue
            val adjusted = item.sentAt + clockOffset
            val prev = map[norm] ?: 0L
            if (adjusted > prev) {
                map[norm] = adjusted
                changed = true
            }
        }
        if (changed) {
            persistOutboundCache(context)
        }
    }

    @Synchronized
    fun getLatestOutboundTimestamp(
        context: Context,
        ownerKey: String,
        normPhone: String,
        maxAllowedTimestampMs: Long
    ): Long {
        if (ownerKey.isBlank() || normPhone.length < 9) return 0L
        ensureOutboundCacheLoaded(context)
        val ts = outboundCache[ownerKey]?.get(normPhone) ?: return 0L
        return if (ts <= maxAllowedTimestampMs) ts else 0L
    }

    @Synchronized
    fun enqueuePendingAck(context: Context, item: PendingAckItem) {
        val current = getPendingAcks(context).filter {
            !(it.outboxId == item.outboxId && it.serverUrl == item.serverUrl)
        }
        val next = (current + item).takeLast(50)
        savePendingAcks(context, next)
    }

    @Synchronized
    fun removePendingAck(context: Context, outboxId: String, serverUrl: String = "") {
        val current = getPendingAcks(context)
        val remaining = current.filter {
            !(it.outboxId == outboxId && (serverUrl.isBlank() || it.serverUrl == serverUrl))
        }
        if (remaining.size == current.size) return
        savePendingAcks(context, remaining)
    }

    @Synchronized
    fun getPendingAcks(context: Context): List<PendingAckItem> {
        val raw = prefs(context).getString(KEY_PENDING_ACKS, "") ?: ""
        if (raw.isBlank()) return emptyList()
        return try {
            val arr = JSONArray(raw)
            val list = mutableListOf<PendingAckItem>()
            for (i in 0 until arr.length()) {
                val obj = arr.optJSONObject(i) ?: continue
                val id = obj.optString("outboxId", "")
                if (id.isNotBlank()) {
                    list.add(
                        PendingAckItem(
                            outboxId = id,
                            success = obj.optBoolean("success", false),
                            errorMessage = obj.optString("errorMessage", "").takeIf { it.isNotBlank() },
                            serverUrl = obj.optString("serverUrl", ""),
                            secret = obj.optString("secret", "")
                        )
                    )
                }
            }
            list
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun savePendingAcks(context: Context, list: List<PendingAckItem>) {
        val arr = JSONArray()
        for (item in list) {
            arr.put(
                JSONObject().apply {
                    put("outboxId", item.outboxId)
                    put("success", item.success)
                    if (!item.errorMessage.isNullOrBlank()) {
                        put("errorMessage", item.errorMessage)
                    }
                    if (item.serverUrl.isNotBlank()) {
                        put("serverUrl", item.serverUrl)
                    }
                    if (item.secret.isNotBlank()) {
                        put("secret", item.secret)
                    }
                }
            )
        }
        prefs(context).edit().putString(KEY_PENDING_ACKS, arr.toString()).apply()
    }

    @Synchronized
    fun appendLog(context: Context, line: String) {
        val stamp = SimpleDateFormat("HH:mm:ss", Locale.KOREA).format(Date())
        val current = prefs(context).getString(KEY_LOGS, "") ?: ""
        val lines = if (current.isBlank()) emptyList() else current.split("\n")
        val updated = (lines + "[$stamp] $line").takeLast(50).joinToString("\n")
        prefs(context).edit().putString(KEY_LOGS, updated).apply()
    }

    fun getLogs(context: Context): String =
        prefs(context).getString(KEY_LOGS, "아직 기록이 없습니다.") ?: ""
}
