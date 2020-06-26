package com.example.pbdexecutives

import androidx.recyclerview.widget.RecyclerView
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView

import com.example.pbdexecutives.dummy.DummyContent.DummyItem

/**
 * [RecyclerView.Adapter] that can display a [DummyItem].
 * TODO: Replace the implementation with code for your data type.
 */

data class MyTaskListItemModel(
    val id: String,
    val type: String,
    val organization: String,
    val remarks: String,
    val reason: String,
    val createdAt: String
)

class MyTasksRecyclerViewAdapter(
    private val values: List<MyTaskListItemModel>
) : RecyclerView.Adapter<MyTasksRecyclerViewAdapter.ViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.fragment_my_tasks, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = values[position]
        holder.taskId.text = item.id
        holder.taskType.text = item.type
        holder.organizationName.text = item.organization
        holder.remark.text = item.remarks
        holder.reason.text = item.reason
        holder.createdAt.text = item.createdAt
    }

    override fun getItemCount(): Int = values.size

    inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val taskType: TextView = view.findViewById(R.id.task_lt_type)
        val organizationName: TextView = view.findViewById(R.id.task_lt_organisation_name)
        val remark: TextView = view.findViewById(R.id.task_lt_remark)
        val reason: TextView = view.findViewById(R.id.task_lt_reason)
        val createdAt: TextView = view.findViewById(R.id.task_lt_createdAt)
        val taskId: TextView = view.findViewById(R.id.task_lt_id)
    }
}