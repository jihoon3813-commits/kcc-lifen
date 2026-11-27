package com.kcc.smsbridge

import android.content.Context
import android.net.Uri
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.concurrent.CopyOnWriteArrayList

data class ScanBatch(
    val items: List<SyncItem>,
    val nextSmsId: Long,
    val nextMmsId: Long
)

object SmsMmsScanner {

    private data class DispatchedRecord(
        val serverUrl: String,
        val normalizedPhone: String,
        val body: String,
        val atMillis: Long
    )

    private val recentDispatches = CopyOnWriteArrayList<DispatchedRecord>()

    fun normalizePhone(raw: String?): String {
        if (raw.isNullOrBlank()) return ""
        val digits = raw.replace(Regex("[^0-9]"), "")
        return if (digits.startsWith("82") && digits.length >= 11) {
            "0${digits.substring(2)}"
        } else {
            digits
        }
    }

    fun isHyowonMessage(body: String?): Boolean {
        val trimmed = (body ?: "").trim()
        if (trimmed.isEmpty()) return false
        return trimmed.startsWith("[효원") ||
            trimmed.contains("[효원") ||
            trimmed.contains("효원상조") ||
            trimmed.contains("효원라이프")
    }

    fun recordBridgeDispatch(serverUrl: String, phone: String, message: String) {
        val now = System.currentTimeMillis()
        recentDispatches.removeIf { now - it.atMillis > 180_000L }
        recentDispatches.add(
            DispatchedRecord(
                serverUrl = serverUrl,
                normalizedPhone = normalizePhone(phone),
                body = message.trim(),
                atMillis = now
            )
        )
    }

    fun wasDispatchedByBridge(phone: String, candidateBody: String): Boolean {
        val now = System.currentTimeMillis()
        val normPhone = normalizePhone(phone)
        val trimmed = candidateBody.trim()
        if (normPhone.isBlank() || trimmed.isBlank()) return false

        recentDispatches.removeIf { now - it.atMillis > 180_000L }
        return recentDispatches.any { rec ->
            rec.normalizedPhone == normPhone &&
                (rec.body == trimmed || (trimmed.length >= 8 && rec.body.contains(trimmed)))
        }
    }

    fun findLatestHyowonOutboundAt(
        context: Context,
        normalizedPhone: String,
        maxTimestampMs: Long
    ): Long {
        if (normalizedPhone.length < 9) return 0L
        var latest = 0L
        val since = System.currentTimeMillis() - 7L * 24L * 60L * 60L * 1000L
        try {
            context.contentResolver.query(
                Uri.parse("content://sms"),
                arrayOf("address", "body", "date", "type"),
                "type = 2 AND date >= ? AND date <= ?",
                arrayOf(since.toString(), maxTimestampMs.toString()),
                "date DESC"
            )?.use { cursor ->
                val addrIdx = cursor.getColumnIndexOrThrow("address")
                val bodyIdx = cursor.getColumnIndexOrThrow("body")
                val dateIdx = cursor.getColumnIndexOrThrow("date")
                var checked = 0
                while (cursor.moveToNext() && checked < 60) {
                    checked++
                    val addr = normalizePhone(cursor.getString(addrIdx))
                    if (addr != normalizedPhone) continue
                    val body = cursor.getString(bodyIdx) ?: ""
                    if (isHyowonMessage(body)) {
                        val ts = cursor.getLong(dateIdx)
                        if (ts > latest) latest = ts
                        break
                    }
                }
            }
        } catch (_: Exception) {
        }
        try {
            val sinceSec = since / 1000L
            val maxSec = (maxTimestampMs / 1000L) + 1L
            context.contentResolver.query(
                Uri.parse("content://mms"),
                arrayOf("_id", "date", "msg_box"),
                "msg_box = 2 AND date >= ? AND date <= ?",
                arrayOf(sinceSec.toString(), maxSec.toString()),
                "date DESC"
            )?.use { cursor ->
                val idIdx = cursor.getColumnIndexOrThrow("_id")
                val dateIdx = cursor.getColumnIndexOrThrow("date")
                var checked = 0
                while (cursor.moveToNext() && checked < 25) {
                    checked++
                    val mmsId = cursor.getLong(idIdx)
                    val phone = readMmsAddress(context, mmsId, isInbound = false)
                    if (normalizePhone(phone) != normalizedPhone) continue
                    val body = readMmsText(context, mmsId)
                    if (isHyowonMessage(body)) {
                        val dateSec = cursor.getLong(dateIdx)
                        val ts = if (dateSec in 1..9_999_999_999L) dateSec * 1000L else dateSec
                        if (ts > latest) latest = ts
                        break
                    }
                }
            }
        } catch (_: Exception) {
        }
        return latest
    }

    fun ensureBaselineInitialized(context: Context) {
        if (BridgePrefs.getLastSmsId(context) < 0L) {
            val maxSms = queryMaxId(context, Uri.parse("content://sms"))
            BridgePrefs.setLastSmsId(context, maxSms)
        }
        if (BridgePrefs.getLastMmsId(context) < 0L) {
            val maxMms = queryMaxId(context, Uri.parse("content://mms"))
            BridgePrefs.setLastMmsId(context, maxMms)
        }
    }

    private fun queryMaxId(context: Context, uri: Uri): Long {
        return try {
            context.contentResolver.query(
                uri,
                arrayOf("_id"),
                null,
                null,
                "_id DESC"
            )?.use { cursor ->
                if (cursor.moveToFirst()) cursor.getLong(0) else 0L
            } ?: 0L
        } catch (_: Exception) {
            0L
        }
    }

    fun collectNewMessages(context: Context): ScanBatch {
        ensureBaselineInitialized(context)

        val startSmsId = BridgePrefs.getLastSmsId(context)
        val startMmsId = BridgePrefs.getLastMmsId(context)
        var nextSmsId = startSmsId
        var nextMmsId = startMmsId
        val collected = mutableListOf<SyncItem>()
        val now = System.currentTimeMillis()

        // 1. 단문(SMS) 스캔 (type 1 = 수신, type 2 = 발신, type 4 = 발신중)
        try {
            context.contentResolver.query(
                Uri.parse("content://sms"),
                arrayOf("_id", "address", "body", "date", "type"),
                "_id > ?",
                arrayOf(startSmsId.toString()),
                "_id ASC"
            )?.use { cursor ->
                val idIdx = cursor.getColumnIndexOrThrow("_id")
                val addrIdx = cursor.getColumnIndexOrThrow("address")
                val bodyIdx = cursor.getColumnIndexOrThrow("body")
                val dateIdx = cursor.getColumnIndexOrThrow("date")
                val typeIdx = cursor.getColumnIndexOrThrow("type")

                while (cursor.moveToNext()) {
                    val id = cursor.getLong(idIdx)
                    val type = cursor.getInt(typeIdx)
                    val dateMs = cursor.getLong(dateIdx)

                    if ((type == 4 || type == 6) && now - dateMs < 60_000L) {
                        break
                    }

                    nextSmsId = id
                    val address = cursor.getString(addrIdx) ?: ""
                    val body = (cursor.getString(bodyIdx) ?: "").trim()
                    if (address.isBlank() || body.isBlank()) continue
                    val ts = if (dateMs > 0) dateMs else now

                    if (type == 1) {
                        collected.add(
                            SyncItem(
                                direction = "inbound",
                                phone = address,
                                message = body,
                                timestamp = ts
                            )
                        )
                    } else if (type == 2) {
                        if (isHyowonMessage(body)) {
                            BridgePrefs.recordOutboundTimestamp(
                                context,
                                BridgePrefs.EXTERNAL_OWNER,
                                address,
                                ts
                            )
                        } else if (!wasDispatchedByBridge(address, body)) {
                            collected.add(
                                SyncItem(
                                    direction = "outbound",
                                    phone = address,
                                    message = body,
                                    timestamp = ts
                                )
                            )
                        }
                    }
                }
            }
        } catch (_: Exception) {
        }

        // 2. 장문(LMS / 텍스트 MMS) 스캔 (msg_box 1 = 수신, 2 = 발신, 4 = 발신중)
        try {
            context.contentResolver.query(
                Uri.parse("content://mms"),
                arrayOf("_id", "msg_box", "date"),
                "_id > ?",
                arrayOf(startMmsId.toString()),
                "_id ASC"
            )?.use { cursor ->
                val idIdx = cursor.getColumnIndexOrThrow("_id")
                val boxIdx = cursor.getColumnIndexOrThrow("msg_box")
                val dateIdx = cursor.getColumnIndexOrThrow("date")

                while (cursor.moveToNext()) {
                    val mmsId = cursor.getLong(idIdx)
                    val msgBox = cursor.getInt(boxIdx)
                    val dateSec = cursor.getLong(dateIdx)
                    val dateMs = if (dateSec in 1..9_999_999_999L) dateSec * 1000L else dateSec

                    if (msgBox == 4 && now - dateMs < 60_000L) {
                        break
                    }

                    val textBody = readMmsText(context, mmsId).trim()
                    val phone = readMmsAddress(context, mmsId, isInbound = (msgBox == 1))

                    if ((textBody.isBlank() || phone.isBlank()) && now - dateMs < 6_000L) {
                        break
                    }

                    nextMmsId = mmsId
                    if (textBody.isBlank() || phone.isBlank()) continue
                    val ts = if (dateMs > 0) dateMs else now

                    if (msgBox == 1) {
                        collected.add(
                            SyncItem(
                                direction = "inbound",
                                phone = phone,
                                message = textBody,
                                timestamp = ts
                            )
                        )
                    } else if (msgBox == 2) {
                        if (isHyowonMessage(textBody)) {
                            BridgePrefs.recordOutboundTimestamp(
                                context,
                                BridgePrefs.EXTERNAL_OWNER,
                                phone,
                                ts
                            )
                        } else if (!wasDispatchedByBridge(phone, textBody)) {
                            collected.add(
                                SyncItem(
                                    direction = "outbound",
                                    phone = phone,
                                    message = textBody,
                                    timestamp = ts
                                )
                            )
                        }
                    }
                }
            }
        } catch (_: Exception) {
        }

        return ScanBatch(items = collected, nextSmsId = nextSmsId, nextMmsId = nextMmsId)
    }

    private fun readMmsText(context: Context, mmsId: Long): String {
        val sb = StringBuilder()
        try {
            context.contentResolver.query(
                Uri.parse("content://mms/part"),
                arrayOf("_id", "ct", "_data", "text"),
                "mid = ?",
                arrayOf(mmsId.toString()),
                "_id ASC"
            )?.use { cursor ->
                val idIdx = cursor.getColumnIndexOrThrow("_id")
                val ctIdx = cursor.getColumnIndexOrThrow("ct")
                val dataIdx = cursor.getColumnIndexOrThrow("_data")
                val textIdx = cursor.getColumnIndexOrThrow("text")

                while (cursor.moveToNext()) {
                    val ct = cursor.getString(ctIdx) ?: ""
                    if (!ct.startsWith("text/plain", ignoreCase = true)) continue

                    val partId = cursor.getLong(idIdx)
                    val dataPath = cursor.getString(dataIdx)
                    val piece = if (!dataPath.isNullOrBlank()) {
                        val partUri = Uri.parse("content://mms/part/$partId")
                        context.contentResolver.openInputStream(partUri)?.use { stream ->
                            BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).readText()
                        } ?: ""
                    } else {
                        cursor.getString(textIdx) ?: ""
                    }
                    if (piece.isNotBlank()) {
                        if (sb.isNotEmpty()) sb.append("\n")
                        sb.append(piece)
                    }
                }
            }
        } catch (_: Exception) {
        }
        return sb.toString()
    }

    private fun readMmsAddress(context: Context, mmsId: Long, isInbound: Boolean): String {
        val preferredType = if (isInbound) 137 else 151 // 137=FROM, 151=TO
        var fallback = ""
        try {
            context.contentResolver.query(
                Uri.parse("content://mms/$mmsId/addr"),
                arrayOf("address", "type"),
                null,
                null,
                null
            )?.use { cursor ->
                val addrIdx = cursor.getColumnIndexOrThrow("address")
                val typeIdx = cursor.getColumnIndexOrThrow("type")
                while (cursor.moveToNext()) {
                    val addr = (cursor.getString(addrIdx) ?: "").trim()
                    val type = cursor.getInt(typeIdx)
                    if (addr.isBlank() || addr.contains("insert-address-token", ignoreCase = true)) {
                        continue
                    }
                    if (type == preferredType) {
                        return addr
                    }
                    if (fallback.isBlank()) {
                        fallback = addr
                    }
                }
            }
        } catch (_: Exception) {
        }
        return fallback
    }
}
