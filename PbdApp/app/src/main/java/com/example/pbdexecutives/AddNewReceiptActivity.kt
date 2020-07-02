package com.example.pbdexecutives

import android.content.DialogInterface
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.util.Log
import android.view.*
import androidx.appcompat.app.AlertDialog
import androidx.constraintlayout.widget.ConstraintSet
import kotlinx.android.synthetic.main.activity_add_new_receipt.*
import kotlinx.android.synthetic.main.activity_add_new_task.*

class AddNewReceiptActivity : AppCompatActivity() {
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
}