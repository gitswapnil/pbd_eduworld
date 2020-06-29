package com.example.pbdexecutives

import androidx.recyclerview.widget.RecyclerView
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.fragment.app.Fragment

import com.example.pbdexecutives.dummy.DummyContent.DummyItem
import kotlin.reflect.KFunction2

data class FollowUpsListItemModel(
    var id: Long,
    var partyName: String,
    var partyAddress: String,
    var cpName: String,
    var cpNumber: String?,
    var reminderDate: String,
    var followUpFor: String?,
    val onClick: KFunction2<@ParameterName(name = "followUpId") Long, @ParameterName(name = "position") Int, FollowUpsFragment.OnItemClick>
)

class FollowUpsRecyclerViewAdapter(
    private val parentFragment: Fragment,
    private val values: List<FollowUpsListItemModel?>
) : RecyclerView.Adapter<FollowUpsRecyclerViewAdapter.ViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.fragment_follow_ups, parent, false)
        return ViewHolder(view)
    }

    private fun changeDataPlaceholdersVisibility(holder: ViewHolder, visibility: Int) {
        holder.followUpId.visibility = visibility
        holder.partyName.visibility = visibility
        holder.partyAddress.visibility = visibility
        holder.cpName.visibility = visibility
        holder.cpNumber.visibility = visibility
        holder.reminderDate.visibility = visibility
        holder.followUpFor.visibility = visibility
        holder.imageView4.visibility = visibility
        holder.imageView6.visibility = visibility
        holder.textView21.visibility = visibility
        holder.textView23.visibility = visibility
        holder.textView24.visibility = visibility

        if(visibility == View.VISIBLE) {
            holder.loaderCircle.visibility = View.GONE
        } else if(visibility == View.GONE){
            holder.loaderCircle.visibility = View.VISIBLE
        }
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = values[position]
        if(item != null) {
            holder.followUpId.text = item.id.toString()
            holder.partyName.text = item.partyName
            holder.partyAddress.text = item.partyAddress
            holder.cpName.text = item.cpName
            holder.cpNumber.text = item.cpNumber
            holder.reminderDate.text = item.reminderDate
            holder.followUpFor.text = item.followUpFor
            holder.followUpItem.setOnClickListener(item.onClick(item.id, position))

            changeDataPlaceholdersVisibility(holder, View.VISIBLE)

            if(item.followUpFor == "Follow up completed") {
                holder.imageView7.visibility = View.VISIBLE
            }
        } else {
            changeDataPlaceholdersVisibility(holder, View.GONE)
        }
    }

    override fun getItemCount(): Int = values.size

    inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val followUpItem: ConstraintLayout = view.findViewById(R.id.follow_ups_list_layout)
        val partyName: TextView = view.findViewById(R.id.follow_up_lt_party_name)
        val partyAddress: TextView = view.findViewById(R.id.follow_up_lt_party_address)
        val cpNumber: TextView = view.findViewById(R.id.follow_up_lt_cp_phone)
        val cpName: TextView = view.findViewById(R.id.follow_up_lt_cp_name)
        val reminderDate: TextView = view.findViewById(R.id.follow_up_lt_reminder_date)
        val followUpFor: TextView = view.findViewById(R.id.follow_up_lt_reason)
        val followUpId: TextView = view.findViewById(R.id.follow_up_lt_id)

        val imageView4: ImageView = view.findViewById(R.id.imageView4)
        val imageView6: ImageView = view.findViewById(R.id.imageView6)
        val imageView7: ImageView = view.findViewById(R.id.imageView7)
        val textView21: TextView = view.findViewById(R.id.textView21)
        val textView23: TextView = view.findViewById(R.id.textView23)
        val textView24: TextView = view.findViewById(R.id.textView24)

        val loaderCircle: ProgressBar = view.findViewById(R.id.follow_up_loader_circle)
    }
}