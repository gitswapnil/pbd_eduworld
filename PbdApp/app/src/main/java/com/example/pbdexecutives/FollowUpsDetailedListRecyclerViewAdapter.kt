package com.example.pbdexecutives

import androidx.recyclerview.widget.RecyclerView
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView

data class FollowUpDetailsListItemObject(
    val followUpFor: String,
    val completedOn: String,
    val cpName: String,
    val cpNumber: String
)

class FollowUpsDetailedListRecyclerViewAdapter(
    private val values: List<FollowUpDetailsListItemObject>
) : RecyclerView.Adapter<FollowUpsDetailedListRecyclerViewAdapter.ViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.follow_up_detailed_list_item, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = values[position]
        holder.followUpFor.text = item.followUpFor
        holder.completedOn.text = item.completedOn
        holder.cpName.text = item.cpName
        holder.cpNumber.text = item.cpNumber
    }

    override fun getItemCount(): Int = values.size

    inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val followUpFor: TextView = view.findViewById(R.id.follow_up_for)
        val completedOn: TextView = view.findViewById(R.id.completed_on)
        val cpName: TextView = view.findViewById(R.id.cp_name)
        val cpNumber: TextView = view.findViewById(R.id.cp_number)
    }
}