package com.example.pbdexecutives

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.lifecycle.lifecycleScope
import androidx.room.Room
import com.example.pbdexecutives.dummy.DummyContent
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import kotlin.collections.ArrayList


/**
 * A fragment representing a list of Items.
 */
class MyTasksFragment : Fragment() {
    private lateinit var recyclerViewAdapter: MyTasksRecyclerViewAdapter
    private lateinit var listItems: MutableList<MyTaskListItemModel>
    private var columnCount = 1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        arguments?.let {
            columnCount = it.getInt(ARG_COLUMN_COUNT)
        }

    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        val view = inflater.inflate(R.layout.fragment_my_tasks_list, container, false)
        //change the action button's onclick
        activity!!.findViewById<FloatingActionButton>(R.id.floating_btn).setOnClickListener { view ->
            createNewTask(view)
        }

        listItems = ArrayList()
        recyclerViewAdapter = MyTasksRecyclerViewAdapter(listItems)
        // Set the adapter
        if (view is RecyclerView) {
            with(view) {
                layoutManager = LinearLayoutManager(context)
                adapter = recyclerViewAdapter
            }
        }

        return view
    }

    override fun onResume() {
        super.onResume()

        loadData(offset = 0)
    }

    private fun loadData(offset: Int = 0) {
        if(offset == 0) {
            listItems.clear()
        }

        this.lifecycleScope.launch {
            val db = this@MyTasksFragment.context?.let { Room.databaseBuilder(it, AppDB::class.java, "PbdDB").build() }
            val tasks = db?.tasksDao()?.getTasks(limit = 10, offset = 0)?.map {
                MyTaskListItemModel(
                    id = "#${it.id.toString()}",
                    organization = it.organization,
                    remarks = it.remarks.toString(),
                    type = if(it.type?.toInt() == 0) "Visited" else "Other",
                    reason = resources.getStringArray(R.array.reasons_for_visit)[it.reasonForVisit.toInt()],
                    createdAt = SimpleDateFormat("dd/MM/yy").format(Date(it.createdAt))
                )
            }

            Log.i("pbdLog", "tasks: $tasks")
            if (tasks != null) {
                listItems.addAll(tasks)
            }
            recyclerViewAdapter.notifyDataSetChanged()
        }
    }

    private fun createNewTask(view: View) {
        Log.i("pbdLog", "Starting AddNewTaskActivity")
        startActivity(Intent(activity, AddNewTaskActivity::class.java))
    }

    companion object {

        // TODO: Customize parameter argument names
        const val ARG_COLUMN_COUNT = "column-count"

        // TODO: Customize parameter initialization
        @JvmStatic
        fun newInstance(columnCount: Int) =
            MyTasksFragment().apply {
                arguments = Bundle().apply {
                    putInt(ARG_COLUMN_COUNT, columnCount)
                }
            }
    }
}