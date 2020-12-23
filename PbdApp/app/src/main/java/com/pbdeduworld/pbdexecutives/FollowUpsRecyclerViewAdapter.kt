package com.pbdeduworld.pbdexecutives

import android.graphics.Color
import androidx.recyclerview.widget.RecyclerView
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.constraintlayout.widget.ConstraintLayout

import kotlin.reflect.KFunction2

data class FollowUpsListItemModel(
    var id: Long,
    var partyName: String,
    var cpName: String,
    var cpNumber: String?,
    var reminderDate: String,
    var followUpFor: String,
    val onClick: KFunction2<@ParameterName(name = "followUpId") Long, @ParameterName(name = "position") Int, FollowUpsFragment.OnItemClick>
)

class FollowUpsRecyclerViewAdapter(
    private val values: List<FollowUpsListItemModel?>
) : RecyclerView.Adapter<FollowUpsRecyclerViewAdapter.ViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.fragment_follow_ups, parent, false)
        return ViewHolder(view)
    }

    private fun changeDataPlaceholdersVisibility(holder: ViewHolder, visibility: Int) {
        holder.partyName.visibility = visibility
        holder.cpName.visibility = visibility
        holder.cpNumber.visibility = visibility
        holder.reminderDate.visibility = visibility
        holder.followUpFor.visibility = visibility
        holder.imageView4.visibility = visibility
        holder.imageView6.visibility = visibility

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
            holder.cpName.text = item.cpName
            holder.cpNumber.text = item.cpNumber
            holder.followUpFor.text = item.followUpFor
            holder.followUpItem.setOnClickListener(item.onClick(item.id, position))

            changeDataPlaceholdersVisibility(holder, View.VISIBLE)

            var reminderDate: String
            if(item.reminderDate == "Reminder not set") {
                holder.imageView6.visibility = View.GONE
                reminderDate = item.reminderDate
                holder.reminderDate.setTextColor(Color.rgb(100, 100, 100))
            } else {
                val reminderInfo = item.reminderDate.split(",")

                if(reminderInfo[0] == "green")
                holder.reminderDate.setTextColor(Color.rgb(40, 167, 69))
                else
                holder.reminderDate.setTextColor(Color.rgb(220, 53, 69))

                reminderDate = reminderInfo[1]
            }

            holder.reminderDate.text = reminderDate
        } else {
            changeDataPlaceholdersVisibility(holder, View.GONE)
        }
    }

    override fun getItemCount(): Int = values.size

    inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val followUpItem: ConstraintLayout = view.findViewById(R.id.follow_ups_list_layout)
        val partyName: TextView = view.findViewById(R.id.follow_up_lt_party_name)
        val cpName: TextView = view.findViewById(R.id.follow_up_lt_cp_name)
        val cpNumber: TextView = view.findViewById(R.id.follow_up_lt_cp_phone)
        val reminderDate: TextView = view.findViewById(R.id.follow_up_lt_reminder_date)
        val followUpFor: TextView = view.findViewById(R.id.follow_up_lt_reason)

        val imageView4: ImageView = view.findViewById(R.id.imageView4)
        val imageView6: ImageView = view.findViewById(R.id.imageView6)

        val loaderCircle: ProgressBar = view.findViewById(R.id.follow_up_loader_circle)
    }
}