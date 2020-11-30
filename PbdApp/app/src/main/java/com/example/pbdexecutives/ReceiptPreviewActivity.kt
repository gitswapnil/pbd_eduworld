package com.example.pbdexecutives

import android.Manifest
import android.app.Activity
import android.app.DownloadManager
import android.content.ComponentName
import android.content.Context
import android.content.DialogInterface
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.util.Log
import android.view.MenuItem
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
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
import java.math.BigDecimal
import java.text.SimpleDateFormat
import java.util.*
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

    private lateinit var filename: String
    private lateinit var downloadUrl: String

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
    }

    override fun onResume() {
        super.onResume()
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

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions!!, grantResults)
        if (grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            downloadReceipt(this)
        }
    }

    private fun checkPermissionAndDownloadReceipt(context: Context, receiptNo: Long) {
        val db = Room.databaseBuilder(context, AppDB::class.java, "PbdDB").build()

        GlobalScope.launch {
            val receiptSeries = db.userDetailsDao().getCurrentUser().receiptSeries
            filename = "${receiptSeries}${receiptNo}.pdf"
            downloadUrl = "${PbdExecutivesUtils.serverAddress}/downloadFile/${filename}";

            if (Build.VERSION.SDK_INT >= 23) {
                if (checkSelfPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED) {
                    Log.e("pbdLog", "You have permission");
                    downloadReceipt(context)
                } else {
                    Log.e("pbdLog", "You have asked for permission");
                    ActivityCompat.requestPermissions(
                        this@ReceiptPreviewActivity,
                        arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE),
                        1
                    );
                }
            }
        }
    }

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

    private fun downloadReceipt(context: Context) {
        val request = DownloadManager.Request(Uri.parse(downloadUrl))
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED) // Visibility of the download Notification
            .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "${filename}") // Uri of the destination file
            .setTitle(filename) // Title of the Download Notification
            .setDescription("Downloading...") // Description of the Download Notification
            .setAllowedOverMetered(true) // Set if download is allowed on Mobile network
            .setAllowedOverRoaming(true) // Set if download is allowed on roaming network

        // get download service and enqueue file

        // get download service and enqueue file
        val manager = getSystemService(DOWNLOAD_SERVICE) as DownloadManager
        manager.enqueue(request)

        downloadingReceiptDialog.dismiss()
//        setResult(Activity.RESULT_OK)
//        finish()

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

    data class RequestObject(
        @SerializedName("apiKey") val apiKey: String,
        @SerializedName("receiptDetails") val receiptDetails: ReceiptDetailsObject
    )

    private val downloadingReceiptDialog = this.let {
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

    private fun sendReceipt() {
        alertDialog.dismiss()

        val sendingReceiptDialog = this.let {
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

        sendingReceiptDialog.show()
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

                    sendingReceiptDialog.dismiss()
                    //add the receipt into database
                    GlobalScope.launch {
                        db.receiptsDao().addReceipt(responseObject)
                    }

                    //download the receipt after saving.
                    downloadingReceiptDialog.show()
                    checkPermissionAndDownloadReceipt(
                        this@ReceiptPreviewActivity,
                        responseObject.receiptNo
                    )
                },
                { code, error ->
                    sendingReceiptDialog.dismiss()
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
}