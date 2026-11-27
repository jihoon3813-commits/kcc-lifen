package com.kcc.smsbridge

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.text.InputType
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : Activity() {

    private lateinit var statusBadge: TextView
    private lateinit var permStatusText: TextView
    private lateinit var batteryStatusText: TextView
    private lateinit var serverUrlInput: EditText
    private lateinit var secretInput: EditText
    private lateinit var devServerUrlInput: EditText
    private lateinit var devSecretInput: EditText
    private lateinit var logsView: TextView

    private val prefListener = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
        if (key == BridgePrefs.KEY_LOGS || key == BridgePrefs.KEY_STATUS_TEXT || key == BridgePrefs.KEY_ENABLED) {
            runOnUiThread { refreshDynamicState() }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.parseColor("#163A6B")
        setContentView(buildContentView())

        serverUrlInput.setText(BridgePrefs.getServerUrl(this))
        secretInput.setText(BridgePrefs.getSecret(this))
        devServerUrlInput.setText(BridgePrefs.getDevServerUrl(this))
        devSecretInput.setText(BridgePrefs.getDevSecret(this))

        BridgePrefs.prefs(this).registerOnSharedPreferenceChangeListener(prefListener)
        refreshDynamicState()

        if (BridgePrefs.isEnabled(this) && hasRequiredSmsPermissions()) {
            SmsBridgeService.start(this)
        }
    }

    override fun onResume() {
        super.onResume()
        refreshDynamicState()
    }

    override fun onDestroy() {
        BridgePrefs.prefs(this).unregisterOnSharedPreferenceChangeListener(prefListener)
        super.onDestroy()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        refreshDynamicState()
        if (!hasRequiredSmsPermissions()) {
            Toast.makeText(
                this,
                "권한이 거부되었습니다. 안드로이드 13 이상은 [앱 정보 > 우측 상단 ⋮ > 제한된 설정 허용] 후 다시 눌러주세요.",
                Toast.LENGTH_LONG
            ).show()
        } else {
            BridgePrefs.appendLog(this, "문자 송수신 권한 허용 완료")
        }
    }

    private fun requiredPermissions(): Array<String> {
        val list = mutableListOf(
            Manifest.permission.SEND_SMS,
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS,
            Manifest.permission.RECEIVE_MMS
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            list.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        return list.toTypedArray()
    }

    private fun hasRequiredSmsPermissions(): Boolean {
        val core = listOf(
            Manifest.permission.SEND_SMS,
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS
        )
        return core.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun isIgnoringBatteryOptimizations(): Boolean {
        val pm = getSystemService(PowerManager::class.java) ?: return false
        return pm.isIgnoringBatteryOptimizations(packageName)
    }

    private fun refreshDynamicState() {
        val enabled = BridgePrefs.isEnabled(this)
        val statusStr = BridgePrefs.getStatusText(this)
        statusBadge.text = if (enabled) "● 작동 중 · $statusStr" else "○ 중지됨"
        statusBadge.background = roundedBg(
            if (enabled) "#E7F2FF" else "#F2F4F6",
            if (enabled) "#163A6B" else "#D1D6DB",
            20
        )
        statusBadge.setTextColor(Color.parseColor(if (enabled) "#163A6B" else "#4E5968"))

        val permOk = hasRequiredSmsPermissions()
        permStatusText.text = if (permOk) {
            "✓ 문자 발송 · 수신 · 읽기 권한 허용 완료"
        } else {
            "✗ 문자 권한 미허용 (아래 버튼을 눌러 허용해주세요)"
        }
        permStatusText.setTextColor(Color.parseColor(if (permOk) "#047857" else "#DC2626"))

        val battOk = isIgnoringBatteryOptimizations()
        batteryStatusText.text = if (battOk) {
            "✓ 배터리 사용량 제한 없음 (백그라운드 상시 유지 완료)"
        } else {
            "✗ 배터리 최적화 제외 필요 (화면 꺼짐 시 끊김 방지)"
        }
        batteryStatusText.setTextColor(Color.parseColor(if (battOk) "#047857" else "#D97706"))

        logsView.text = BridgePrefs.getLogs(this)
    }

    private fun dp(value: Int): Int =
        TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value.toFloat(),
            resources.displayMetrics
        ).toInt()

    private fun roundedBg(fillHex: String, strokeHex: String? = null, radiusDp: Int = 12): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(radiusDp).toFloat()
            setColor(Color.parseColor(fillHex))
            if (strokeHex != null) {
                setStroke(dp(1), Color.parseColor(strokeHex))
            }
        }
    }

    private fun buildContentView(): View {
        val scroll = ScrollView(this).apply {
            setBackgroundColor(Color.parseColor("#F4F6FA"))
            isFillViewport = true
        }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(20), dp(18), dp(28))
        }
        scroll.addView(root)

        val title = TextView(this).apply {
            text = "KCC 문자연동 v${BridgePrefs.APP_VERSION}"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#142033"))
        }
        root.addView(title)

        val subtitle = TextView(this).apply {
            text = "KCC홈씨씨 어드민 전용 문자 브릿지 앱입니다. 기존 소노·효원 문자연동 앱과 별도로 동시에 설치·실행할 수 있습니다."
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setTextColor(Color.parseColor("#5A6B82"))
            setPadding(0, dp(4), 0, dp(12))
        }
        root.addView(subtitle)

        statusBadge = TextView(this).apply {
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12.5f)
            setTypeface(null, Typeface.BOLD)
            setPadding(dp(12), dp(8), dp(12), dp(8))
        }
        root.addView(
            statusBadge,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(16) }
        )

        // 1. 필수 권한 설정 카드
        val permCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = roundedBg("#FFFFFF", "#DCE4F0", 14)
            setPadding(dp(16), dp(16), dp(16), dp(16))
        }
        permCard.addView(sectionTitle("1. 최초 1회 권한 및 상시 실행 설정"))

        permStatusText = TextView(this).apply {
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12.5f)
            setPadding(0, dp(6), 0, dp(6))
        }
        permCard.addView(permStatusText)

        val btnRow1 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        val reqPermBtn = styledButton("문자 권한 요청", "#163A6B", "#FFFFFF").apply {
            setOnClickListener {
                ActivityCompat.requestPermissions(this@MainActivity, requiredPermissions(), 101)
            }
        }
        val appInfoBtn = styledButton("앱 설정 열기 (제한해제)", "#EDF2FA", "#163A6B").apply {
            setOnClickListener {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", packageName, null)
                }
                startActivity(intent)
            }
        }
        btnRow1.addView(reqPermBtn, LinearLayout.LayoutParams(0, dp(42), 1f).apply { rightMargin = dp(8) })
        btnRow1.addView(appInfoBtn, LinearLayout.LayoutParams(0, dp(42), 1f))
        permCard.addView(btnRow1)

        batteryStatusText = TextView(this).apply {
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12.5f)
            setPadding(0, dp(12), 0, dp(6))
        }
        permCard.addView(batteryStatusText)

        val batteryBtn = styledButton("배터리 제한 없음 허용하기", "#F4F7FC", "#163A6B").apply {
            setOnClickListener {
                try {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    startActivity(intent)
                } catch (_: Exception) {
                    startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
                }
            }
        }
        permCard.addView(batteryBtn, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(42)))

        root.addView(
            permCard,
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
                .apply { bottomMargin = dp(14) }
        )

        // 2. 서버 연결 설정 카드
        val configCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = roundedBg("#FFFFFF", "#DCE4F0", 14)
            setPadding(dp(16), dp(16), dp(16), dp(16))
        }
        configCard.addView(sectionTitle("2. KCC 어드민 서버 연결 정보"))

        configCard.addView(fieldLabel("운영 서버 주소 (환경설정 > 문자(SMS) 관리에서 확인)"))
        serverUrlInput = EditText(this).apply {
            hint = BridgePrefs.DEFAULT_SERVER_URL
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f)
            setTextColor(Color.parseColor("#191F28"))
            background = roundedBg("#F9FAFB", "#D1D6DB", 10)
            setPadding(dp(12), dp(10), dp(12), dp(10))
            setSingleLine(true)
        }
        configCard.addView(serverUrlInput)

        configCard.addView(fieldLabel("운영 앱 연동 보안키 (kcc_...)"))
        secretInput = EditText(this).apply {
            hint = "운영 어드민에서 생성·저장한 보안키 입력"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f)
            setTextColor(Color.parseColor("#191F28"))
            background = roundedBg("#F9FAFB", "#D1D6DB", 10)
            setPadding(dp(12), dp(10), dp(12), dp(10))
            setSingleLine(true)
        }
        configCard.addView(secretInput)

        val devSectionLabel = TextView(this).apply {
            text = "개발/테스트 어드민 동시 연동 (선택)"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12.5f)
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#163A6B"))
            setPadding(0, dp(16), 0, dp(2))
        }
        configCard.addView(devSectionLabel)

        val devHelpLabel = TextView(this).apply {
            text = "운영과 개발을 동시에 연결하면 가장 최근 문자를 보낸 어드민에만 답장이 표시됩니다."
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
            setTextColor(Color.parseColor("#6B7684"))
        }
        configCard.addView(devHelpLabel)

        configCard.addView(fieldLabel("개발 서버 주소 (선택)"))
        devServerUrlInput = EditText(this).apply {
            hint = BridgePrefs.DEFAULT_DEV_SERVER_URL
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f)
            setTextColor(Color.parseColor("#191F28"))
            background = roundedBg("#F9FAFB", "#D1D6DB", 10)
            setPadding(dp(12), dp(10), dp(12), dp(10))
            setSingleLine(true)
        }
        configCard.addView(devServerUrlInput)

        configCard.addView(fieldLabel("개발 앱 연동 보안키 (선택)"))
        devSecretInput = EditText(this).apply {
            hint = "비워두면 운영 서버만 단독 연동"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f)
            setTextColor(Color.parseColor("#191F28"))
            background = roundedBg("#F9FAFB", "#D1D6DB", 10)
            setPadding(dp(12), dp(10), dp(12), dp(10))
            setSingleLine(true)
        }
        configCard.addView(devSecretInput)

        val actionRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, dp(14), 0, 0)
        }
        val startBtn = styledButton("연동 시작 · 저장", "#163A6B", "#FFFFFF").apply {
            setOnClickListener {
                val url = serverUrlInput.text.toString().trim().trimEnd('/')
                val secret = secretInput.text.toString().trim()
                val devUrl = devServerUrlInput.text.toString().trim().trimEnd('/')
                val devSecret = devSecretInput.text.toString().trim()
                if (url.isBlank() || !url.startsWith("http")) {
                    Toast.makeText(this@MainActivity, "올바른 운영 서버 주소를 입력해주세요.", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                if (secret.isBlank()) {
                    Toast.makeText(this@MainActivity, "운영 어드민의 연동 보안키를 입력해주세요.", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                if ((devUrl.isNotBlank() && devSecret.isBlank()) || (devUrl.isBlank() && devSecret.isNotBlank())) {
                    Toast.makeText(this@MainActivity, "개발 어드민 동시 연동 시 주소와 보안키를 모두 입력해주세요.", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                if (devUrl.isNotBlank() && !devUrl.startsWith("http")) {
                    Toast.makeText(this@MainActivity, "올바른 개발 서버 주소를 입력해주세요.", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                if (!hasRequiredSmsPermissions()) {
                    Toast.makeText(this@MainActivity, "먼저 위 [문자 권한 요청]을 완료해주세요.", Toast.LENGTH_LONG).show()
                    return@setOnClickListener
                }

                BridgePrefs.saveConfig(this@MainActivity, url, secret, devUrl, devSecret)
                SmsMmsScanner.ensureBaselineInitialized(this@MainActivity)
                BridgePrefs.setEnabled(this@MainActivity, true)
                BridgePrefs.appendLog(this@MainActivity, "KCC 연동 서비스를 시작합니다...")
                SmsBridgeService.start(this@MainActivity)
                refreshDynamicState()
                Toast.makeText(this@MainActivity, "KCC 실시간 문자 연동이 시작되었습니다!", Toast.LENGTH_SHORT).show()
            }
        }
        val stopBtn = styledButton("중지", "#FEE2E2", "#B91C1C").apply {
            setOnClickListener {
                BridgePrefs.setEnabled(this@MainActivity, false)
                BridgePrefs.setStatusText(this@MainActivity, "중지됨")
                BridgePrefs.appendLog(this@MainActivity, "연동이 중지되었습니다.")
                SmsBridgeService.stop(this@MainActivity)
                refreshDynamicState()
            }
        }
        actionRow.addView(startBtn, LinearLayout.LayoutParams(0, dp(46), 2f).apply { rightMargin = dp(8) })
        actionRow.addView(stopBtn, LinearLayout.LayoutParams(0, dp(46), 1f))
        configCard.addView(actionRow)

        root.addView(
            configCard,
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
                .apply { bottomMargin = dp(14) }
        )

        // 3. 실시간 활동 로그 카드
        val logCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = roundedBg("#FFFFFF", "#DCE4F0", 14)
            setPadding(dp(16), dp(16), dp(16), dp(16))
        }
        logCard.addView(sectionTitle("3. 실시간 동기화 로그"))

        logsView = TextView(this).apply {
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f)
            typeface = Typeface.MONOSPACE
            setTextColor(Color.parseColor("#333D4B"))
            background = roundedBg("#F9FAFB", "#E5E8EB", 10)
            setPadding(dp(12), dp(10), dp(12), dp(10))
            minLines = 6
        }
        logCard.addView(
            logsView,
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
                .apply { topMargin = dp(8) }
        )

        root.addView(logCard)
        return scroll
    }

    private fun sectionTitle(text: String): TextView =
        TextView(this).apply {
            this.text = text
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#142033"))
        }

    private fun fieldLabel(text: String): TextView =
        TextView(this).apply {
            this.text = text
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#4E5968"))
            setPadding(0, dp(12), 0, dp(6))
        }

    private fun styledButton(label: String, bgHex: String, fgHex: String): Button =
        Button(this).apply {
            text = label
            isAllCaps = false
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor(fgHex))
            background = roundedBg(bgHex, null, 10)
            gravity = Gravity.CENTER
            stateListAnimator = null
        }
}
