package com.example.pbdexecutives

import androidx.recyclerview.widget.RecyclerView
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.fragment.app.Fragment
import kotlin.reflect.KFunction1

data class MyTaskListItemModel(
    var id: Long,
    var type: String,
    var party: String,
    var remarks: String,
    var reason: String?,
    val createdAt: String,
    val onClick: KFunction1<@ParameterName(name = "taskId") Long, MyTasksFragment.OnItemClick>
)

class MyTasksRecyclerViewAdapter(
    private val parentFragment: Fragment,
    private val values: List<MyTaskListItemModel?>
) : RecyclerView.Adapter<MyTasksRecyclerViewAdapter.ViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.fragment_my_tasks, parent, false)
        return ViewHolder(view)
    }

    private fun changeDataPlaceholdersVisibility(holder: ViewHolder, visibility: Int) {
        holder.taskId.visibility = visibility
        holder.taskType.visibility = visibility
        holder.partyName.visibility = visibility
        holder.remark.visibility = visibility
        holder.reason.visibility = visibility
        holder.createdAt.visibility = visibility

        if(visibility == View.VISIBLE) {
            holder.loaderCircle.visibility = View.GONE
        } else if(visibility == View.GONE){
            holder.loaderCircle.visibility = View.VISIBLE
        }
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = values[position]
        if(item != null) {
            holder.taskId.text = item.id.toString()
            holder.taskType.text = item.type
            holder.partyName.text = item.party
            holder.remark.text = item.remarks
            holder.reason.text = item.reason
            holder.createdAt.text = item.createdAt
            holder.taskItem.setOnClickListener(item.onClick(item.id))

            changeDataPlaceholdersVisibility(holder, View.VISIBLE)
        } else {
            changeDataPlaceholdersVisibility(holder, View.GONE)
        }

    }

    override fun getItemCount(): Int = values.size

    inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val taskItem: ConstraintLayout = view.findViewById(R.id.my_task_list_layout)
        val taskType: TextView = view.findViewById(R.id.task_lt_type)
        val partyName: TextView = view.findViewById(R.id.task_lt_party_name)
        val remark: TextView = view.findViewById(R.id.task_lt_remark)
        val reason: TextView = view.findViewById(R.id.task_lt_reason)
        val createdAt: TextView = view.findViewById(R.id.task_lt_createdAt)
        val taskId: TextView = view.findViewById(R.id.task_lt_id)
        val loaderCircle: ProgressBar = view.findViewById(R.id.tasks_loader_circle)
    }


}