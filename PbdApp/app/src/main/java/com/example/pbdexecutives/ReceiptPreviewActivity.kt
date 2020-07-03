package com.example.pbdexecutives

import android.content.DialogInterface
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.util.Log
import android.view.MenuItem
import android.view.View
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import androidx.room.Room
import com.android.volley.DefaultRetryPolicy
import com.google.android.material.snackbar.Snackbar
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.android.synthetic.main.activity_receipt_preview.*
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.math.BigDecimal
import java.text.SimpleDateFormat
import java.util.*
import kotlin.properties.Delegates

class ReceiptPreviewActivity : AppCompatActivity() {
    private lateinit var partyId: String
    private lateinit var cpName: String
    private var cpNumber by Delegates.notNull<Long>()
    private lateinit var cpEmail: String
    private lateinit var amount: BigDecimal
    private var paidBy by Delegates.notNull<Byte>()
    private lateinit var chequeNo: String
    private lateinit var ddNo: String
    private var payment by Delegates.notNull<Byte>()

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

        partyId = intent.getStringExtra("partyId")
        cpName = intent.getStringExtra("cpName")
        cpNumber = intent.getLongExtra("cpNumber", 0)
        cpEmail = intent.getStringExtra("cpEmail")
        amount = intent.getStringExtra("amount").toBigDecimal()
        paidBy = intent.getByteExtra("paidBy", 0)
        chequeNo = intent.getStringExtra("chequeNo")
        ddNo = intent.getStringExtra("ddNo")
        payment = intent.getByteExtra("payment", 0)
    }

    override fun onResume() {
        super.onResume()

        val db = Room.databaseBuilder(this@ReceiptPreviewActivity, AppDB::class.java, "PbdDB").build()
        GlobalScope.launch {
            val thisUser = db.userDetailsDao().getCurrentUser()
            val partyDetails = db.partiesDao().getPartyDetails(id = partyId)
            representative.text = thisUser.name
            receipt_date.text = SimpleDateFormat("dd/MM/yy").format(Date())
            customer_code.text = partyDetails.code
            customer_name.text = partyDetails.name
            customer_address.text = partyDetails.address
            customer_contact.text = partyDetails.cNumber.toString()
            paid_by.text = if(paidBy == 1.toByte()) getString(R.string.cheque)
                            else if(paidBy == 2.toByte()) getString(R.string.demand_draft) else getString(R.string.cash)
            cheque_no.text = if(chequeNo != null && chequeNo != "") chequeNo else ""
            dd_no.text = if(ddNo != null && ddNo != "") ddNo else ""
            receipt_payment.text = if(payment == 1.toByte()) getString(R.string.full) else getString(R.string.part)
            paid_amount.text = amount.toString()
            receipt_sent_to.text = "${cpName} (${cpNumber}), ${cpEmail}"
        }

    }

    data class ReceiptDetailsObject (
        @SerializedName("partyId") val partyId: String,
        @SerializedName("cpName") val cpName: String,
        @SerializedName("cpNumber") val cpNumber: Long,
        @SerializedName("cpEmail") val cpEmail: String,
        @SerializedName("amount") val amount: BigDecimal,
        @SerializedName("paidBy") val paidBy: Byte,
        @SerializedName("chequeNo") val chequeNo: String,
        @SerializedName("ddNo") val ddNo: String,
        @SerializedName("payment") val payment: Byte
    )

    data class RequestObject(
        @SerializedName("apiKey") val apiKey: String,
        @SerializedName("receiptDetails") val receiptDetails: ReceiptDetailsObject
    )

    fun showSendAlert(view: View) {
        val alertDialog: AlertDialog? = this.let {
            val builder = AlertDialog.Builder(it)
            builder.apply {
                setPositiveButton(R.string.yes,
                    DialogInterface.OnClickListener { dialog, id ->
                        // User clicked OK button
                        sendReceipt()
                    })
                setNegativeButton(R.string.cancel,
                    DialogInterface.OnClickListener { dialog, id ->
                        // User cancelled the dialog
                    })
            }
            // Set other dialog properties
            builder.setTitle(R.string.confirm).setMessage("${getString(R.string.confirm_send_receipt)} ${cpNumber.toString()}")

            // Create the AlertDialog
            builder.create()
        }

        alertDialog?.show()
    }

    private fun sendReceipt() {
        lifecycleScope.launch {
            val db = Room.databaseBuilder(this@ReceiptPreviewActivity, AppDB::class.java, "PbdDB").build()
            val apiKey = db.userDetailsDao().getApiKey()
            val requestJSONObject = JSONObject(
                Gson().toJson(RequestObject(
                    apiKey = apiKey,
                    receiptDetails = ReceiptDetailsObject(
                        partyId = partyId,
                        cpName = cpName,
                        cpNumber = cpNumber,
                        cpEmail = cpEmail,
                        amount = amount,
                        paidBy = paidBy.toByte(),
                        chequeNo = chequeNo,
                        ddNo = ddNo,
                        payment = payment.toByte()
                    ))
                ))

            PbdExecutivesUtils().sendData(this@ReceiptPreviewActivity, "generatereceipt", requestJSONObject,
                { code, response ->
                    Log.i("pbdLog", "response: $response")
                    val responseObject = Gson().fromJson(
                        response.toString(),
                        Receipts::class.java
                    );      //convert the response back into JSON Object from the response string

                    GlobalScope.launch {
                        db.receiptsDao().addReceipt(responseObject)

                    }
                },
                { code, error ->
                    Snackbar.make(receipt_preview_layout, "${getString(R.string.cannot_generate_the_receipt)} $error", Snackbar.LENGTH_LONG).show()
                },
                DefaultRetryPolicy(
                    DefaultRetryPolicy.DEFAULT_TIMEOUT_MS,
                    DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                    DefaultRetryPolicy.DEFAULT_BACKOFF_MULT
                )
            )
        }

    }
}