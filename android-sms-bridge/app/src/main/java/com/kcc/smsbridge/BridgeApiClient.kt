package com.kcc.smsbridge

import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

data class OutboxJob(
    val outboxId: String,
    val receiverPhone: String,
    val title: String,
    val message: String
)

data class RecentOutbound(
    val phone: String,
    val sentAt: Long
)

data class PollResponse(
    val ok: Boolean,
    val error: String?,
    val jobs: List<OutboxJob>,
    val serverNow: Long = 0L,
    val recentOutbounds: List<RecentOutbound> = emptyList()
)

data class SyncItem(
    val direction: String, // "inbound" | "outbound"
    val phone: String,
    val message: String,
    val timestamp: Long
)

data class SyncResponse(
    val ok: Boolean,
    val synced: Int,
    val error: String?
)

object BridgeApiClient {

    private fun postJson(endpoint: String, secret: String, payload: JSONObject): Pair<Int, JSONObject?> {
        val conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 8_000
            readTimeout = 12_000
            useCaches = false
            doOutput = true
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
            setRequestProperty("Connection", "close")
            setRequestProperty("X-Bridge-Secret", secret)
        }
        return try {
            OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val body = stream?.let { s ->
                BufferedReader(InputStreamReader(s, Charsets.UTF_8)).use { it.readText() }
            } ?: ""
            val json = if (body.isNotBlank()) runCatching { JSONObject(body) }.getOrNull() else null
            Pair(code, json)
        } finally {
            conn.disconnect()
        }
    }

    fun poll(serverUrl: String, secret: String, deviceName: String): PollResponse {
        val body = JSONObject().apply {
            put("secret", secret)
            put("deviceName", deviceName)
            put("appVersion", BridgePrefs.APP_VERSION)
        }
        val (code, json) = postJson("$serverUrl/api/sms-bridge/poll", secret, body)
        if (code !in 200..299 || json == null || !json.optBoolean("ok", false)) {
            val err = json?.optString("error", "HTTP $code") ?: "HTTP $code"
            return PollResponse(ok = false, error = err, jobs = emptyList())
        }

        val jobsArr = json.optJSONArray("jobs") ?: JSONArray()
        val jobs = mutableListOf<OutboxJob>()
        for (i in 0 until jobsArr.length()) {
            val item = jobsArr.optJSONObject(i) ?: continue
            val outboxId = item.optString("outboxId", "")
            val receiverPhone = item.optString("receiverPhone", "")
            val message = item.optString("message", "")
            if (outboxId.isNotBlank() && receiverPhone.isNotBlank() && message.isNotBlank()) {
                jobs.add(
                    OutboxJob(
                        outboxId = outboxId,
                        receiverPhone = receiverPhone,
                        title = item.optString("title", ""),
                        message = message
                    )
                )
            }
        }

        val serverNow = json.optLong("serverNow", 0L)
        val outboundsArr = json.optJSONArray("recentOutbounds") ?: JSONArray()
        val recentOutbounds = mutableListOf<RecentOutbound>()
        for (i in 0 until outboundsArr.length()) {
            val item = outboundsArr.optJSONObject(i) ?: continue
            val phone = item.optString("phone", "")
            val sentAt = item.optLong("sentAt", 0L)
            if (phone.isNotBlank() && sentAt > 0L) {
                recentOutbounds.add(RecentOutbound(phone = phone, sentAt = sentAt))
            }
        }

        return PollResponse(
            ok = true,
            error = null,
            jobs = jobs,
            serverNow = serverNow,
            recentOutbounds = recentOutbounds
        )
    }

    fun ack(serverUrl: String, secret: String, outboxId: String, success: Boolean, errorMessage: String?): Boolean {
        val body = JSONObject().apply {
            put("secret", secret)
            put("outboxId", outboxId)
            put("success", success)
            if (!errorMessage.isNullOrBlank()) {
                put("errorMessage", errorMessage)
            }
        }
        val (code, json) = postJson("$serverUrl/api/sms-bridge/ack", secret, body)
        return code in 200..299 && (json?.optBoolean("ok", false) == true)
    }

    fun sync(serverUrl: String, secret: String, deviceName: String, items: List<SyncItem>): SyncResponse {
        val arr = JSONArray()
        for (item in items) {
            arr.put(
                JSONObject().apply {
                    put("direction", item.direction)
                    put("phone", item.phone)
                    put("message", item.message)
                    put("timestamp", item.timestamp)
                }
            )
        }
        val body = JSONObject().apply {
            put("secret", secret)
            put("deviceName", deviceName)
            put("messages", arr)
        }
        val (code, json) = postJson("$serverUrl/api/sms-bridge/sync", secret, body)
        if (code !in 200..299 || json == null || !json.optBoolean("ok", false)) {
            return SyncResponse(
                ok = false,
                synced = 0,
                error = json?.optString("error", "HTTP $code") ?: "HTTP $code"
            )
        }
        return SyncResponse(
            ok = true,
            synced = json.optInt("synced", 0),
            error = null
        )
    }
}
