package com.example.pbdexecutives

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.util.Log
import android.view.*
import android.widget.AdapterView
import androidx.constraintlayout.widget.ConstraintSet
import androidx.lifecycle.lifecycleScope
import androidx.room.Room
import com.android.volley.DefaultRetryPolicy
import com.google.android.material.snackbar.Snackbar
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.android.synthetic.main.activity_add_new_receipt.*
import kotlinx.android.synthetic.main.activity_add_new_receipt.select_party_for_receipts
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.math.BigDecimal

class AddNewReceiptActivity : AppCompatActivity() {
    private lateinit var parties: List<PartiesListItem>
    private lateinit var selectedPartyId: String
    private lateinit var selectedPartyName: String

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
        setContentView(R.layout.activity_add_new_receipt)

        setSupportActionBar(findViewById(R.id.add_new_receipt_toolbar))
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        attachPaidByHandlers()
        loadParties()
    }

    private fun attachPaidByHandlers() {
        paid_by_radio_group.setOnCheckedChangeListener { group, checkedId ->
            cheque_no_label.visibility = View.GONE
            cheque_no.visibility = View.GONE
            dd_no_label.visibility = View.GONE
            dd_no.visibility = View.GONE

            val constraintSet: ConstraintSet = ConstraintSet()
            val checkedId = paid_by_radio_group.checkedRadioButtonId
            constraintSet.clone(add_new_receipt_layout)
            when(checkedId) {
                R.id.paid_by_radio_cheque -> {
                    constraintSet.connect(R.id.payment_label, ConstraintSet.TOP, R.id.cheque_no, ConstraintSet.BOTTOM, 8)
                    constraintSet.applyTo(add_new_receipt_layout)
                    cheque_no_label.visibility = View.VISIBLE
                    cheque_no.visibility = View.VISIBLE
                }
                R.id.paid_by_radio_dd -> {
                    constraintSet.connect(R.id.payment_label, ConstraintSet.TOP, R.id.dd_no, ConstraintSet.BOTTOM, 8)
                    constraintSet.applyTo(add_new_receipt_layout)
                    dd_no_label.visibility = View.VISIBLE
                    dd_no.visibility = View.VISIBLE
                }
                else -> {
                    constraintSet.connect(R.id.payment_label, ConstraintSet.TOP, R.id.paid_by_radio_group, ConstraintSet.BOTTOM, 8)
                    constraintSet.applyTo(add_new_receipt_layout)
                }
            }
        }
    }

    private fun loadParties() {
        lifecycleScope.launch {
//            var partiesListLayoutView = this@AddNewTaskActivity.layoutInflater.inflate(R.layout.parties_list_layout, scrollView3, false)
            val db = Room.databaseBuilder(this@AddNewReceiptActivity, AppDB::class.java, "PbdDB").build()
            parties = db.partiesDao().getAllParties().map { party ->
                return@map PartiesListItem(party.id, party.name, party.address)
            }

//            val partiesAdapter: ArrayAdapter<String> = ArrayAdapter<String>(this@AddNewTaskActivity, android.R.layout.simple_spinner_dropdown_item, parties)
            select_party_for_receipts.threshold = 1
            select_party_for_receipts.setAdapter(PartiesListAdapter(this@AddNewReceiptActivity, parties))
            select_party_for_receipts.onItemClickListener = AdapterView.OnItemClickListener { parent, view, position, id ->
//                Log.i("pbdLog", "clicked Item, ${parent.getItemAtPosition(position)}")
                val ListItem = (parent.getItemAtPosition(position) as PartiesListItem)
                select_party_for_receipts.error = null
                selectedPartyId = ListItem.id
                selectedPartyName = ListItem.name
                select_party_for_receipts.setText("${ListItem.name} ${ListItem.address}")
            }
        }
    }

    private fun validateFields(): Boolean {
        var retValue: Boolean = true

        if(this::selectedPartyId.isInitialized) {
            val selectedParty = parties.find{ it.id == selectedPartyId }
            val nameAndAddress = select_party_for_receipts.text.toString()
            if(selectedParty == null || ("${selectedParty.name} ${selectedParty.address}") != nameAndAddress) {
                select_party_for_receipts.error = getString(R.string.select_only_from_list)
                retValue = false
            }
        } else {
            select_party_for_receipts.error = getString(R.string.this_field_is_required)
            retValue = false
        }

        if(cp_name.text == null || cp_name.text.toString() == "") {
            cp_name.error = getString(R.string.this_field_is_required)
            retValue = false
        }

        if(cp_number.text == null || cp_number.text.toString() == "") {
            cp_number.error = getString(R.string.this_field_is_required)
            retValue = false
        }

        if(amount.text == null || amount.text.toString() == "") {
            amount.error = getString(R.string.this_field_is_required)
            retValue = false
        }

        if(paid_by_radio_group.checkedRadioButtonId == R.id.paid_by_radio_cheque) {
            if(cheque_no.text == null || cheque_no.text.toString() == "") {
                cheque_no.error = getString(R.string.this_field_is_required)
                retValue = false
            }
        } else if(paid_by_radio_group.checkedRadioButtonId == R.id.paid_by_radio_dd) {
            if(dd_no.text == null || dd_no.text.toString() == "") {
                dd_no.error = getString(R.string.this_field_is_required)
                retValue = false
            }
        }

        return retValue
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

    fun saveChanges(view: View) {
        //first validate the inputs and then save the data

        val valid: Boolean = validateFields()
        if (!valid) {
            return
        }

        val cpName = cp_name.text.toString()
        val cpNumber = cp_number.text.toString().toLong()
        val cpEmail = cpEmail.text.toString()
        val amount = amount.text.toString().toBigDecimal()
        val paidBy =   if(paid_by_radio_group.checkedRadioButtonId == R.id.paid_by_radio_cheque) 1
                            else if(paid_by_radio_group.checkedRadioButtonId == R.id.paid_by_radio_dd) 2 else 0
        val chequeNo = if(paidBy == 1) cheque_no.text.toString() else ""
        val ddNo = if(paidBy == 2) dd_no.text.toString() else ""
        val payment = if(payment_radio_group.checkedRadioButtonId == R.id.payment_full) 1 else 0

        if(!PbdExecutivesUtils().isInternetExists(this)) {
            Snackbar.make(add_new_receipt_layout, "${getString(R.string.cannot_generate_the_receipt)} ${getString(R.string.no_internet_connection)}", Snackbar.LENGTH_LONG).show()
            return
        }

        lifecycleScope.launch {
            val db = Room.databaseBuilder(this@AddNewReceiptActivity, AppDB::class.java, "PbdDB").build()
            val apiKey = db.userDetailsDao().getApiKey()
            val requestJSONObject = JSONObject(Gson().toJson(RequestObject(
                apiKey = apiKey,
                receiptDetails = ReceiptDetailsObject(
                    partyId = selectedPartyId,
                    cpName = cpName,
                    cpNumber = cpNumber,
                    cpEmail = cpEmail,
                    amount = amount,
                    paidBy = paidBy.toByte(),
                    chequeNo = chequeNo,
                    ddNo = ddNo,
                    payment = payment.toByte()
                ))))

            PbdExecutivesUtils().sendData(this@AddNewReceiptActivity, "generatereceipt", requestJSONObject,
                { code, response ->
                    Log.i("pbdLog", "response: $response")
                },
                { code, error ->
                    Snackbar.make(add_new_receipt_layout, "${getString(R.string.cannot_generate_the_receipt)} ${error}", Snackbar.LENGTH_LONG).show()
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