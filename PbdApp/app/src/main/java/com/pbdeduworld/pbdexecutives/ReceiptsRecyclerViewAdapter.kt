package com.pbdeduworld.pbdexecutives

import androidx.recyclerview.widget.RecyclerView
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.constraintlayout.widget.ConstraintLayout
import kotlin.reflect.KFunction2

data class ReceiptsListItemModel(
    var id: Long,
    var receiptNo: String,
    var partyName: String,
    var amount: String,
    var cpName: String,
    var cpNumber: String,
    var isReceived: Boolean,
    var createdAt: String,
    val onClick: KFunction2<@ParameterName(name = "receiptId") Long, @ParameterName(name = "position") Int, ReceiptsFragment.OnItemClick>
)

class ReceiptsRecyclerViewAdapter(
    private val values: List<ReceiptsListItemModel?>
) : RecyclerView.Adapter<ReceiptsRecyclerViewAdapter.ViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.fragment_receipts, parent, false)
        return ViewHolder(view)
    }

    private fun changeDataPlaceholdersVisibility(holder: ReceiptsRecyclerViewAdapter.ViewHolder, visibility: Int) {
        holder.partyName.visibility = visibility
        holder.amount.visibility = visibility
        holder.cpNumber.visibility = visibility
        holder.cpName.visibility = visibility
        holder.receiptDate.visibility = visibility
        holder.receiptNo.visibility = visibility
        holder.imageView7.visibility = visibility
        holder.textView41.visibility = visibility
        holder.textView36.visibility = visibility
        holder.textView47.visibility = visibility

        if(visibility == View.VISIBLE) {
            holder.loaderCircle.visibility = View.GONE
        } else if(visibility == View.GONE){
            holder.loaderCircle.visibility = View.VISIBLE
        }
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = values[position]
        if(item != null) {
            holder.partyName.text = item.partyName
            holder.amount.text = item.amount
            holder.receiptDate.text = item.createdAt
            holder.cpNumber.text = item.cpNumber
            holder.cpName.text = item.cpName
            holder.receiptNo.text = item.receiptNo
            holder.receiptItem.setOnClickListener(item.onClick(item.id, position))

            if(item.isReceived) {
                holder.receivedMark.visibility = View.VISIBLE
            } else {
                holder.receivedMark.visibility = View.GONE
            }

            changeDataPlaceholdersVisibility(holder, View.VISIBLE)
        } else {
            changeDataPlaceholdersVisibility(holder, View.GONE)
        }
    }

    override fun getItemCount(): Int = values.size

    inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        var partyName: TextView = view.findViewById(R.id.receipt_lt_party_name)
        val amount: TextView = view.findViewById(R.id.receipt_lt_receipt_amount)
        val receiptDate: TextView = view.findViewById(R.id.receipt_lt_date)
        val cpNumber: TextView = view.findViewById(R.id.receipt_lt_cp_number)
        val cpName: TextView = view.findViewById(R.id.receipt_lt_cp_name)
        val receiptNo: TextView = view.findViewById(R.id.receipt_lt_receipt_no)
        val textView41: TextView = view.findViewById(R.id.textView41)
        val textView47: TextView = view.findViewById(R.id.textView47)
        val textView36: TextView = view.findViewById(R.id.textView36)
        val imageView7: ImageView = view.findViewById(R.id.imageView7)
        val loaderCircle: ProgressBar = view.findViewById(R.id.receipts_lt_loader)
        val receivedMark: ImageView = view.findViewById(R.id.imageView8)
        val receiptItem: ConstraintLayout = view.findViewById(R.id.receipts_list_item_layout)
    }
}