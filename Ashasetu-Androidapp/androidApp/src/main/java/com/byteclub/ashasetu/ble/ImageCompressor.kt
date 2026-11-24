package com.byteclub.ashasetu.ble

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.util.zip.CRC32

object ImageCompressor {

    private const val TAG_IMG = "WearableImage"
    private const val MAX_BYTES = 12000 // Target <= 11.7 KB
    private const val HARD_CAP_BYTES = 12288 // Hard cap 12 KB (matches MAX_IMG_SIZE on ESP32 receiver)

    data class CompressedResult(
        val bytes: ByteArray,
        val crc32: Long,
        val width: Int,
        val height: Int
    )

    suspend fun compressUriToTinyJpeg(
        context: Context,
        uri: Uri
    ): CompressedResult = withContext(Dispatchers.IO) {
        val bitmap = decodeAndOrientBitmap(context, uri)
            ?: throw IllegalArgumentException("failed to decode image from uri")

        try {
            compressBitmapToTinyJpeg(bitmap)
        } catch (e: Exception) {
            val fileSizeStr = getFileSizeString(context, uri)
            Log.e(
                TAG_IMG,
                "Failed at step [compress]: uri=$uri, scheme=${uri.scheme}, fileSize=$fileSizeStr, " +
                        "exception=${e.javaClass.name}, message=${e.message}",
                e
            )
            throw e
        }
    }

    private fun getFileSizeString(context: Context, uri: Uri): String {
        return try {
            if (uri.scheme == "file") {
                val file = java.io.File(uri.path ?: "")
                if (file.exists()) "${file.length()} bytes" else "file not found"
            } else {
                context.contentResolver.openFileDescriptor(uri, "r")?.use { pfd ->
                    "${pfd.statSize} bytes"
                } ?: "unknown"
            }
        } catch (e: Exception) {
            "unknown (${e.message})"
        }
    }

    private fun decodeAndOrientBitmap(context: Context, uri: Uri): Bitmap? {
        val fileSizeStr = getFileSizeString(context, uri)

        // Step 1: Bounds pass (inJustDecodeBounds) with fresh stream
        val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        try {
            val boundsStream = context.contentResolver.openInputStream(uri)
            if (boundsStream == null) {
                Log.e(
                    TAG_IMG,
                    "Failed at step [open stream]: uri=$uri, scheme=${uri.scheme}, fileSize=$fileSizeStr, " +
                            "exception=NullStreamException, message=openInputStream returned null for bounds pass"
                )
                throw IllegalArgumentException("failed to decode image from uri")
            }
            boundsStream.use { stream ->
                BitmapFactory.decodeStream(stream, null, options)
            }
        } catch (e: Exception) {
            if (e !is IllegalArgumentException) {
                Log.e(
                    TAG_IMG,
                    "Failed at step [bounds]: uri=$uri, scheme=${uri.scheme}, fileSize=$fileSizeStr, " +
                            "exception=${e.javaClass.name}, message=${e.message}",
                    e
                )
            }
            throw e
        }

        if (options.outWidth <= 0 || options.outHeight <= 0) {
            val msg = "Decoded image bounds are invalid (${options.outWidth}x${options.outHeight})"
            Log.e(
                TAG_IMG,
                "Failed at step [bounds]: uri=$uri, scheme=${uri.scheme}, fileSize=$fileSizeStr, " +
                        "exception=IllegalArgumentException, message=$msg"
            )
            throw IllegalArgumentException("failed to decode image from uri")
        }

        // Calculate sampleSize for 800px maximum resolution target
        val reqWidth = 800
        val reqHeight = 800
        var sampleSize = 1
        val height = options.outHeight
        val width = options.outWidth

        if (height > reqHeight || width > reqWidth) {
            val halfHeight = height / 2
            val halfWidth = width / 2
            while (halfHeight / sampleSize >= reqHeight && halfWidth / sampleSize >= reqWidth) {
                sampleSize *= 2
            }
        }

        // Step 2: Real decode pass with fresh stream
        val decodeOptions = BitmapFactory.Options().apply {
            inSampleSize = sampleSize
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }

        val decodedBitmap: Bitmap = try {
            val decodeStream = context.contentResolver.openInputStream(uri)
            if (decodeStream == null) {
                Log.e(
                    TAG_IMG,
                    "Failed at step [open stream]: uri=$uri, scheme=${uri.scheme}, fileSize=$fileSizeStr, " +
                            "exception=NullStreamException, message=openInputStream returned null for decode pass"
                )
                throw IllegalArgumentException("failed to decode image from uri")
            }
            val bmp = decodeStream.use { stream ->
                BitmapFactory.decodeStream(stream, null, decodeOptions)
            }
            bmp ?: run {
                Log.e(
                    TAG_IMG,
                    "Failed at step [decode]: uri=$uri, scheme=${uri.scheme}, fileSize=$fileSizeStr, " +
                            "exception=NullBitmapException, message=BitmapFactory.decodeStream returned null"
                )
                throw IllegalArgumentException("failed to decode image from uri")
            }
        } catch (e: Exception) {
            if (e !is IllegalArgumentException) {
                Log.e(
                    TAG_IMG,
                    "Failed at step [decode]: uri=$uri, scheme=${uri.scheme}, fileSize=$fileSizeStr, " +
                            "exception=${e.javaClass.name}, message=${e.message}",
                    e
                )
            }
            throw e
        }

        // Step 3: EXIF orientation pass with fresh stream
        val orientation = try {
            val exifStream = context.contentResolver.openInputStream(uri)
            if (exifStream != null) {
                exifStream.use { stream ->
                    getExifOrientationFromStream(stream)
                }
            } else {
                0
            }
        } catch (e: Exception) {
            Log.e(
                TAG_IMG,
                "Failed at step [EXIF]: uri=$uri, scheme=${uri.scheme}, fileSize=$fileSizeStr, " +
                        "exception=${e.javaClass.name}, message=${e.message}",
                e
            )
            0
        }

        return if (orientation != 0) {
            rotateBitmap(decodedBitmap, orientation)
        } else {
            decodedBitmap
        }
    }

    private fun getExifOrientationFromStream(inputStream: InputStream): Int {
        val exif = ExifInterface(inputStream)
        return when (exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
            ExifInterface.ORIENTATION_ROTATE_90 -> 90
            ExifInterface.ORIENTATION_ROTATE_180 -> 180
            ExifInterface.ORIENTATION_ROTATE_270 -> 270
            else -> 0
        }
    }

    private fun rotateBitmap(bitmap: Bitmap, degrees: Int): Bitmap {
        val matrix = Matrix().apply { postRotate(degrees.toFloat()) }
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    private fun compressBitmapToTinyJpeg(bitmap: Bitmap): CompressedResult {
        var maxDimension = 800
        var compressedBytes: ByteArray? = null
        var scaledBitmap: Bitmap? = null

        while (maxDimension >= 200) {
            scaledBitmap = scaleBitmapToMaxDimension(bitmap, maxDimension)
            var quality = 92

            while (quality >= 30) {
                val baos = ByteArrayOutputStream()
                scaledBitmap.compress(Bitmap.CompressFormat.JPEG, quality, baos)
                val candidate = baos.toByteArray()

                if (candidate.size <= MAX_BYTES) {
                    compressedBytes = candidate
                    break
                }
                if (candidate.size <= HARD_CAP_BYTES && compressedBytes == null) {
                    compressedBytes = candidate
                }
                quality -= 4
            }

            if (compressedBytes != null && compressedBytes.size <= MAX_BYTES) {
                break
            }

            maxDimension -= 80
        }

        val finalBytes = compressedBytes ?: run {
            val baos = ByteArrayOutputStream()
            (scaledBitmap ?: bitmap).compress(Bitmap.CompressFormat.JPEG, 30, baos)
            baos.toByteArray()
        }

        val crc = CRC32().apply { update(finalBytes) }.value
        val finalBmp = scaledBitmap ?: bitmap

        return CompressedResult(
            bytes = finalBytes,
            crc32 = crc,
            width = finalBmp.width,
            height = finalBmp.height
        )
    }

    private fun scaleBitmapToMaxDimension(bitmap: Bitmap, maxDim: Int): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        if (width <= maxDim && height <= maxDim) return bitmap

        val ratio = width.toFloat() / height.toFloat()
        val targetW: Int
        val targetH: Int
        if (width >= height) {
            targetW = maxDim
            targetH = (maxDim / ratio).toInt().coerceAtLeast(1)
        } else {
            targetH = maxDim
            targetW = (maxDim * ratio).toInt().coerceAtLeast(1)
        }
        return Bitmap.createScaledBitmap(bitmap, targetW, targetH, true)
    }
}
