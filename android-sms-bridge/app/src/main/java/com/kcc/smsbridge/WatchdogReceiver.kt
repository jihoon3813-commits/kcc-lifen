package com.kcc.smsbridge

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager

class WatchdogReceiver : BroadcastReceiver() {

    companion object {
        private const val ACTION_WATCHDOG = "com.kcc.smsbridge.ACTION_WATCHDOG"
        private const val REQUEST_CODE = 7801
        const val DEFAULT_INTERVAL_MS = 45_000L

        fun scheduleNext(context: Context, delayMs: Long = DEFAULT_INTERVAL_MS) {
            if (!BridgePrefs.isEnabled(context)) return
            val am = context.getSystemService(AlarmManager::class.java) ?: return
            val pi = buildPendingIntent(context)
            val triggerAt = System.currentTimeMillis() + delayMs

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                } else {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                }
            } catch (_: SecurityException) {
                runCatching { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi) }
            } catch (_: Exception) {
            }
        }

        fun cancel(context: Context) {
            val am = context.getSystemService(AlarmManager::class.java) ?: return
            runCatching { am.cancel(buildPendingIntent(context)) }
        }

        private fun buildPendingIntent(context: Context): PendingIntent {
            val intent = Intent(context, WatchdogReceiver::class.java).apply {
                action = ACTION_WATCHDOG
                setPackage(context.packageName)
            }
            return PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (!BridgePrefs.isEnabled(context)) return

        val pm = context.getSystemService(PowerManager::class.java)
        val tempWake = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "kcc:WatchdogHandOff")
        runCatching { tempWake?.acquire(10_000L) }

        scheduleNext(context, DEFAULT_INTERVAL_MS)
        SmsBridgeService.nudgeSync(context)
    }
}
