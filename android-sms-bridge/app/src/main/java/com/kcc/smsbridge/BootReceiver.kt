package com.kcc.smsbridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == null) return
        if (!BridgePrefs.isEnabled(context)) return

        WatchdogReceiver.scheduleNext(context, 3_000L)
        try {
            SmsBridgeService.start(context)
        } catch (e: Exception) {
            BridgePrefs.appendLog(context, "자동 시작 예약됨: ${e.message}")
        }
    }
}
