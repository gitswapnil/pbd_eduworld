package com.pbdeduworld.pbdexecutives

import android.app.Activity
import android.content.*
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.util.Base64
import android.util.Log
import android.view.MenuItem
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import androidx.room.Room
import com.android.volley.DefaultRetryPolicy
import com.google.android.material.snackbar.Snackbar
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.android.synthetic.main.activity_add_new_receipt.*
import kotlinx.android.synthetic.main.activity_receipt_preview.*
import kotlinx.android.synthetic.main.activity_receipt_preview.cheque_no
import kotlinx.android.synthetic.main.activity_receipt_preview.dd_no
import kotlinx.android.synthetic.main.receipt_receiver_details.*
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.math.BigDecimal
import java.text.SimpleDateFormat
import java.util.*
import kotlin.concurrent.schedule
import kotlin.properties.Delegates


class ReceiptPreviewActivity : AppCompatActivity(), ActivityCompat.OnRequestPermissionsResultCallback {
    private var receiptId: Long = 0
    private var serverId: String? = null
    private lateinit var partyId: String
    private lateinit var cpName: String
    private lateinit var cpNumber: String
    private lateinit var cpEmail: String
    private lateinit var amount: String
    private var paidBy by Delegates.notNull<Byte>()
    private var chequeNo: String? = null
    private var ddNo: String? = null
    private var bankName: String? = null
    private var bankBranch: String? = null
    private var payment by Delegates.notNull<Byte>()
    private lateinit var alertDialog: AlertDialog
    private lateinit var downloadingReceiptDialog: AlertDialog

    private var receiptSeries: String = ""
    private var receiptNo by Delegates.notNull<Long>()

//    private lateinit var pdfByteArray: ByteArray

    override fun onOptionsItemSelected(item: MenuItem) =
        when (item.itemId) {
//        R.id.task_delete -> {
//            true
//        }

            else -> {
                // If we got here, the user's action was not recognized.
                // Invoke the superclass to handle it.
                finish();
                super.onOptionsItemSelected(item)
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_receipt_preview)

        setSupportActionBar(findViewById(R.id.receipt_preview_toolbar))
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        val db = Room.databaseBuilder(this@ReceiptPreviewActivity, AppDB::class.java, "PbdDB").build()
        GlobalScope.launch {
            receiptSeries = db.userDetailsDao().getCurrentUser().receiptSeries
            receiptId = intent.getLongExtra("receiptId", 0)
            val thisUser = db.userDetailsDao().getCurrentUser()
            representative.text = thisUser.name

            if(receiptId == 0.toLong()) {
                partyId = intent.getStringExtra("partyId")
                amount = intent.getStringExtra("amount")
                paidBy = intent.getByteExtra("paidBy", 0)
                chequeNo = if(paidBy == 0.toByte()) null else intent.getStringExtra("chequeNo")
                ddNo = if(paidBy == 0.toByte()) null else intent.getStringExtra("ddNo")
                bankName = if(paidBy == 0.toByte()) null else intent.getStringExtra("bankName")
                bankBranch = if(paidBy == 0.toByte()) null else intent.getStringExtra("bankBranch")
                payment = intent.getByteExtra("payment", 0)

                val partyDetails = db.partiesDao().getPartyDetails(id = partyId)
                receipt_date.text = SimpleDateFormat("dd/MM/yy").format(Date())
                customer_code.text = partyDetails.code
                customer_name.text = partyDetails.name
                customer_address.text = partyDetails.address
                customer_contact.text = partyDetails.cNumber.toString()

                receipt_no_row.visibility = View.GONE
                this_receipt_sent_to.visibility = View.GONE
                receipt_sent_to.visibility = View.GONE

            } else {
                val receiptDetails: ReceiptsWithSendToList = db.receiptsDao().getReceiptDetails(id = receiptId)

                serverId = receiptDetails.serverId
                partyId = receiptDetails.partyId
                amount = receiptDetails.amount
                paidBy = receiptDetails.paidBy
                chequeNo = if(receiptDetails.paidBy == 0.toByte()) null else receiptDetails.chequeNo.toString()
                ddNo = if(receiptDetails.paidBy == 0.toByte()) null else receiptDetails.ddNo.toString()
                bankName = if(receiptDetails.paidBy == 0.toByte()) null else receiptDetails.bankName.toString()
                bankBranch = if(receiptDetails.paidBy == 0.toByte()) null else receiptDetails.bankBranch.toString()
                payment = receiptDetails.payment

                if(receiptDetails.receivedAt > 1.toLong()) {     //if greater than 1 means it is received.
                    imageView9.visibility = View.VISIBLE
                }

                receipt_date.text = SimpleDateFormat("dd/MM/yy").format(Date(receiptDetails.createdAt))
                customer_code.text = receiptDetails.partyCode
                customer_name.text = receiptDetails.partyName
                customer_address.text = receiptDetails.partyAddress
                customer_contact.text = receiptDetails.partyPhNumber

                receipt_no_row.visibility = View.VISIBLE
                receipt_no.text = "${thisUser.receiptSeries}${receiptDetails.receiptNo.toString()}"

                this_receipt_sent_to.visibility = View.VISIBLE
                receipt_sent_to.visibility = View.VISIBLE

                val sentTos = receiptDetails.sentToList.split(",")
                val cpCreatedAts = receiptDetails.concatCreatedAt?.split(",")
                var finalString: String = ""
                cpCreatedAts?.forEachIndexed { index, s ->
                    finalString += "\n ${sentTos[index]} at ${SimpleDateFormat(
                        "dd/MM/yy HH:mm"
                    ).format(Date(cpCreatedAts[index].toLong()))}"
                }
                receipt_sent_to.text = finalString
//
            }

            cheque_no_row.visibility = View.GONE
            dd_no_row.visibility = View.GONE
            bank_name_row.visibility = View.GONE
            bank_branch_row.visibility = View.GONE
            paid_by.text = getString(R.string.cash)

            if(paidBy == 1.toByte()) {
                paid_by.text = getString(R.string.cheque)
                cheque_no_row.visibility = View.VISIBLE
                cheque_no.text = if(chequeNo != null && chequeNo != "") chequeNo else ""
            } else if(paidBy == 2.toByte()) {
                paid_by.text = getString(R.string.demand_draft)
                dd_no_row.visibility = View.VISIBLE
                dd_no.text = if(ddNo != null && ddNo != "") ddNo else ""
            }

            if(bankName != null) {
                bank_name_row.visibility = View.VISIBLE
                receipt_bank_name.text = bankName
            }

            if(bankBranch != null) {
                bank_branch_row.visibility = View.VISIBLE
                receipt_bank_branch.text = bankBranch
            }

            receipt_payment.text = if(payment == 1.toByte()) getString(R.string.full) else getString(
                R.string.part
            )
            paid_amount.text = "${getString(R.string.rupee)} $amount"
        }

//        registerReceiver(onDownloadComplete, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
        initializeDownloadingDialog()
    }

    private fun initializeDownloadingDialog() {
        downloadingReceiptDialog = this.let {
            val builder = AlertDialog.Builder(it)
            val inflater = this.layoutInflater

            builder.setView(inflater.inflate(R.layout.receipt_downloading_loader, null))

            // Set other dialog properties
            builder.setTitle(R.string.please_wait)
//            .setMessage("${getString(R.string.confirm_send_receipt)} ${cpNumber.toString()}")
            builder.setCancelable(false)

            // Create the AlertDialog
            builder.create()
        }
    }

    override fun onResume() {
        super.onResume()
    }

    override fun onDestroy() {
        super.onDestroy()
//        unregisterReceiver(onDownloadComplete)
    }

    private fun validateDialogInputs(view: View): Boolean {
        var retValue: Boolean = true

        val receipt_send_to_dialog_ph_number = view.findViewById<EditText>(R.id.receipt_send_to_dialog_ph_number)
        val receipt_send_to_dialog_cp_name = view.findViewById<EditText>(R.id.receipt_send_to_dialog_cp_name)
        val receipt_send_to_dialog_cpEmail = view.findViewById<EditText>(R.id.receipt_send_to_dialog_cp_email)

        if(receipt_send_to_dialog_ph_number.text == null || receipt_send_to_dialog_ph_number.text.toString() == "") {
            receipt_send_to_dialog_ph_number.error = getString(R.string.this_field_is_required)
            retValue = false
        }

        if(receipt_send_to_dialog_ph_number.text.length != 10) {
            receipt_send_to_dialog_ph_number.error = getString(R.string.proper_mobile_number)
            retValue = false
        }

        if(receipt_send_to_dialog_cp_name.text == null || receipt_send_to_dialog_cp_name.text.toString() == "") {
            receipt_send_to_dialog_cp_name.error = getString(R.string.this_field_is_required)
            retValue = false
        }

        val emailRegex = "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$".toRegex()
        if(receipt_send_to_dialog_cpEmail.text != null) {
            val receipantEmail = receipt_send_to_dialog_cpEmail.text.toString()
            if(receipantEmail != "") {
                val emailValidationResult = emailRegex.matches(receipantEmail)
                if(!emailValidationResult) {
                    receipt_send_to_dialog_cpEmail.error = getString(R.string.invalid_email_address)
                    retValue = false
                }
            }
        }

        return retValue
    }

    fun showSendAlert(view: View) {
        val builder = AlertDialog.Builder(this)
        val inflater = this.layoutInflater
        val dialogView = inflater.inflate(R.layout.receipt_receiver_details, null)

        alertDialog = builder   .setView(dialogView)
                                .setPositiveButton(R.string.ok, null)
                                .setNegativeButton(
                                    R.string.cancel,
                                    DialogInterface.OnClickListener { dialog, id ->
                                        // User cancelled the dialog
                                        dialog.dismiss()
                                    })
                                .setCancelable(false)
                                .setTitle(R.string.send_receipt_to)
                                .create()
        alertDialog.setOnShowListener {
            val button: Button = (alertDialog as AlertDialog).getButton(AlertDialog.BUTTON_POSITIVE)
            button.setOnClickListener(View.OnClickListener {
                // User clicked OK button
                if (validateDialogInputs(dialogView)) {
                    cpNumber =
                        dialogView.findViewById<EditText>(R.id.receipt_send_to_dialog_ph_number).text.toString()
                    cpName =
                        dialogView.findViewById<EditText>(R.id.receipt_send_to_dialog_cp_name).text.toString()
                    cpEmail =
                        dialogView.findViewById<EditText>(R.id.receipt_send_to_dialog_cp_email).text.toString()
                    sendReceipt()
                }

            })
        }
        alertDialog.show()
    }

//    override fun onRequestPermissionsResult(
//        requestCode: Int,
//        permissions: Array<out String>,
//        grantResults: IntArray
//    ) {
//        super.onRequestPermissionsResult(requestCode, permissions!!, grantResults)
//        if (grantResults[0] == PackageManager.PERMISSION_GRANTED) {
//            downloadReceipt()
//        }
//    }
//
//    private fun checkPermissionAndDownloadReceipt() {
//        if (Build.VERSION.SDK_INT >= 23) {
//            if (checkSelfPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED) {
//                Log.i("pbdLog", "You have permission");
//                downloadReceipt()
//            } else {
//                Log.i("pbdLog", "You have asked for permission");
//                ActivityCompat.requestPermissions(
//                    this@ReceiptPreviewActivity,
//                    arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE),
//                    1
//                );
//            }
//        }
//    }

    private fun whatsAppInstalled() : Boolean {
        val pm = packageManager
        var app_installed = false
        app_installed = try {
            pm.getPackageInfo("com.whatsapp", PackageManager.GET_ACTIVITIES)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
        return app_installed
    }

//    private var downloadID by Delegates.notNull<Long>()
//
//    private val onDownloadComplete: BroadcastReceiver = object : BroadcastReceiver() {
//        override fun onReceive(context: Context?, intent: Intent) {
//            //Fetching the download id received with the broadcast
//            val id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)
//            //Checking if the received broadcast is for our enqueued download by matching download id
//            if (downloadID === id) {
//                Toast.makeText(
//                    this@ReceiptPreviewActivity,
//                    "Download Completed",
//                    Toast.LENGTH_SHORT
//                ).show()
//            }
//
////            downloadingReceiptDialog.dismiss()
//            setResult(Activity.RESULT_OK)
//            finish()
//        }
//    }

//    private fun downloadReceipt() {
//        val filename = "${receiptSeries}${receiptNo}.pdf"
//        val downloadUrl = "${PbdExecutivesUtils.serverAddress}/downloadFile/${filename}";
////        val downloadUrl = "https://file-examples-com.github.io/uploads/2017/10/file-sample_150kB.pdf";
//
//        val request: DownloadManager.Request = DownloadManager.Request(Uri.parse(downloadUrl))
//            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED) // Visibility of the download Notification
//            .setTitle(filename) // Title of the Download Notification
//            .setDescription("Downloading...") // Description of the Download Notification
//            .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename) // Uri of the destination file
//            .setAllowedOverRoaming(true)
//            .setAllowedOverMetered(true)
//
//        // get download service and enqueue file
//
//        // get download service and enqueue file
//        val manager = getSystemService(DOWNLOAD_SERVICE) as DownloadManager
//        downloadID = manager.enqueue(request)




//        if(whatsAppInstalled()) {
//            val whatsappIntent: Intent = Intent().apply {
//                action = Intent.ACTION_MAIN
//                component = ComponentName(
//                    "com.whatsapp",
//                    "com.whatsapp.Conversation"
//                )
//                putExtra("jid", "919686253652" + "@s.whatsapp.net")
////                action = Intent.ACTION_SEND
////                putExtra(Intent.EXTRA_TEXT, "This is my text to send.")
////                type = "text/plain"
//                setPackage("com.whatsapp")
//            }
//
//            startActivity(whatsappIntent)
//        } else {
//            val uri = Uri.parse("market://details?id=com.whatsapp")
//            val goToMarket = Intent(Intent.ACTION_VIEW, uri)
//            Toast.makeText(
//                this, "WhatsApp not Installed",
//                Toast.LENGTH_SHORT
//            ).show()
//            startActivity(goToMarket)
//        }
//    }

    private fun folderPath(): String {
        return "${applicationContext.getExternalFilesDir(null)}${File.separator}Receipts"
    }

    private fun gotoWhatsapp(mobileNo: String, fileName: String) {
//        val builder = VmPolicy.Builder()
//        StrictMode.setVmPolicy(builder.build())

        if(whatsAppInstalled()) {
            val receiptFile = File(folderPath(), fileName)
            val uri: Uri;
            if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                uri = FileProvider.getUriForFile(this, "com.pbdeduworld.pbdexecutives.fileprovider", receiptFile);
            } else {
                uri = Uri.fromFile(receiptFile)
            }

            Log.i("pbdLog", "file uri: $uri")

            val whatsappIntent: Intent = Intent().apply {
                action = Intent.ACTION_SEND
//                component = ComponentName(
//                    "com.whatsapp",
//                    "com.whatsapp.Conversation"
//                )
//                putExtra("jid", "$mobileNo" + "@s.whatsapp.net")
//                action = Intent.ACTION_SEND
//                putExtra(Intent.EXTRA_TEXT, "This is my text to send.")
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
//                setPackage("com.whatsapp")
            }
            val shareIntent = Intent.createChooser(whatsappIntent, null);
            startActivity(shareIntent)
        } else {
            val uri = Uri.parse("market://details?id=com.whatsapp")
            val goToMarket = Intent(Intent.ACTION_VIEW, uri)
            Toast.makeText(
                this, "WhatsApp not Installed",
                Toast.LENGTH_SHORT
            ).show()
            startActivity(goToMarket)
        }
    }

    data class ReceiptDetailsObject(
        @SerializedName("serverId") val serverId: String?,
        @SerializedName("partyId") val partyId: String,
        @SerializedName("cpName") val cpName: String,
        @SerializedName("cpNumber") val cpNumber: String,
        @SerializedName("cpEmail") val cpEmail: String,
        @SerializedName("amount") val amount: BigDecimal,
        @SerializedName("paidBy") val paidBy: Byte,
        @SerializedName("chequeNo") val chequeNo: String?,
        @SerializedName("ddNo") val ddNo: String?,
        @SerializedName("bankName") val bankName: String?,
        @SerializedName("bankBranch") val bankBranch: String?,
        @SerializedName("payment") val payment: Byte
    )

    data class ReceiptPdf(
        @SerializedName("pdf") val pdf: String
    )

    data class RequestObject(
        @SerializedName("apiKey") val apiKey: String,
        @SerializedName("receiptDetails") val receiptDetails: ReceiptDetailsObject
    )

    private fun sendReceipt() {
        alertDialog.dismiss()

        val generatingReceiptDialog = this.let {
            val builder = AlertDialog.Builder(it)
            val inflater = this.layoutInflater

            builder.setView(inflater.inflate(R.layout.receipt_sending_loader, null))

            // Set other dialog properties
            builder.setTitle(R.string.please_wait)
//            .setMessage("${getString(R.string.confirm_send_receipt)} ${cpNumber.toString()}")
            builder.setCancelable(false)

            // Create the AlertDialog
            builder.create()
        }

        generatingReceiptDialog.show()
        lifecycleScope.launch {
            val db = Room.databaseBuilder(this@ReceiptPreviewActivity, AppDB::class.java, "PbdDB").build()
            val apiKey = db.userDetailsDao().getApiKey()
            val requestJSONObject = JSONObject(
                Gson().toJson(
                    RequestObject(
                        apiKey = apiKey,
                        receiptDetails = ReceiptDetailsObject(
                            serverId = serverId,
                            partyId = partyId,
                            cpName = cpName,
                            cpNumber = cpNumber,
                            cpEmail = cpEmail,
                            amount = amount.toBigDecimal(),
                            paidBy = paidBy,
                            chequeNo = chequeNo,
                            ddNo = ddNo,
                            bankName = bankName,
                            bankBranch = bankBranch,
                            payment = payment
                        )
                    )
                )
            )

            PbdExecutivesUtils.sendData(
                this@ReceiptPreviewActivity, "generatereceipt", requestJSONObject,
                { code, response ->
                    Log.i("pbdLog", "response: $response")
                    val responseObject = Gson().fromJson(
                        response.toString(),
                        Receipts::class.java
                    );      //convert the response back into JSON Object from the response string

                    generatingReceiptDialog.dismiss()
                    //add the receipt into database
                    GlobalScope.launch {
                        db.receiptsDao().addReceipt(responseObject)
                    }

                    val receiptPdf = Gson().fromJson(
                        response.toString(),
                        ReceiptPdf::class.java
                    );      //convert the response of ReceiptPDF key to base64 string as returned by the server.

                    receiptNo = responseObject.receiptNo
                    val fileName = "${receiptSeries}${receiptNo}.pdf"

                    createReceiptFile(fileName, receiptPdf.pdf, {
                        newFileName ->
                        gotoWhatsapp(cpNumber, newFileName)
                        setResult(Activity.RESULT_OK)
                        finish()
                    }, { errorMessage ->
                        Toast.makeText(applicationContext, errorMessage, Toast.LENGTH_SHORT)
                    })

                    //download the receipt after saving.
//                    downloadingReceiptDialog.show()
//                    checkPermissionAndDownloadReceipt()
                },
                { code, error ->
                    generatingReceiptDialog.dismiss()
                    Snackbar.make(
                        receipt_preview_layout,
                        "${getString(R.string.cannot_generate_the_receipt)} $error",
                        Snackbar.LENGTH_LONG
                    ).show()
                },
                DefaultRetryPolicy(500000, 0, DefaultRetryPolicy.DEFAULT_BACKOFF_MULT)
            )
        }
    }

//    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
//        super.onActivityResult(requestCode, resultCode, data)
//
//        if (requestCode == CREATE_FILE && resultCode == Activity.RESULT_OK) {
//            // The result data contains a URI for the document or directory that
//            // the user selected.
//            data?.data?.also { uri ->
//                // Perform operations on the document using its URI.
//
//                Log.i("pbdLog", "url: ${uri}");
//            }
//        }
//
//    }

//    // Request code for creating a PDF document.
//    private val CREATE_FILE = 1
//
    private fun createReceiptFile(
    fileName: String,
    base64Data: String,
    onSuccess: (fileName: String) -> Unit,
    onError: (message: String) -> Unit
) {
        try {
            val storageState = Environment.getExternalStorageState()
            Log.i("pbdLog", "receipt base64: $base64Data")

            val pdfByteArray = Base64.decode(base64Data, Base64.DEFAULT)
            if(Environment.MEDIA_MOUNTED == storageState) {        //If storage is mounted then
                Log.i("pbdLog", "External Storage is Mounted. We can save file now.")
                var folder = File(folderPath())
                if(!folder.exists()) {          //create the folder if it does not exists.
                    folder.mkdirs()
                }

                var file: File
                var cond = true
                var index = 0
                do {
                    file = File(
                        folderPath(),
                        "${receiptSeries}${receiptNo}${if (index == 0) "" else "($index)"}.pdf"
                    )
                    if(!file.exists()) {
                        index = 0
                        cond = false
                    }
                    index++
                } while (cond)

                val stream = FileOutputStream(file)
                stream.write(pdfByteArray)
                stream.flush()
                stream.close()
                Log.i("pbdLog", file.name)
                onSuccess(file.name)
            } else {
                Log.i("pbdLog", "External Storage is not Mounted")
                onError("External storage is not either not present or not mounted.")
            }
        } catch (e: Exception) {
            Log.e("pbdLog", e.message)
            e.message?.toString()?.let { onError(it) }
        }
    }
//
//
//    private fun openDirectory(pickerInitialUri: Uri) {
//        // Choose a directory using the system's file picker.
//        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
//            // Provide read access to files and sub-directories in the user-selected
//            // directory.
//            flags = Intent.FLAG_GRANT_READ_URI_PERMISSION
//
//            // Optionally, specify a URI for the directory that should be opened in
//            // the system file picker when it loads.
//            putExtra(DocumentsContract.EXTRA_INITIAL_URI, pickerInitialUri)
//        }
//
//        startActivityForResult(intent, 11)
//    }

}