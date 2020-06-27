package com.example.pbdexecutives

import android.app.Activity.RESULT_OK
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import androidx.annotation.NonNull
import androidx.fragment.app.Fragment
import androidx.lifecycle.Observer
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.room.Room
import com.google.android.material.floatingactionbutton.FloatingActionButton
import kotlinx.android.synthetic.main.activity_login.view.*
import kotlinx.android.synthetic.main.fragment_my_tasks_list.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import kotlin.collections.ArrayList


/**
 * A fragment representing a list of Items.
 */
class MyTasksFragment : Fragment() {
    private var linearLayoutManager: LinearLayoutManager = LinearLayoutManager(context)
    private lateinit var recyclerViewAdapter: MyTasksRecyclerViewAdapter
    private lateinit var listItems: MutableList<MyTaskListItemModel?>
    private var columnCount = 1
    private var offset: Int = 0
    private var isLoading = true

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
                layoutManager = linearLayoutManager
                adapter = recyclerViewAdapter
            }
        }

        return view
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        tasks_list.addOnScrollListener(OnScrollListener())
        reloadData()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == 43 && resultCode == RESULT_OK && data != null) {
//            val resultKey = data.getIntExtra("someKey")
            reloadData()
        }
    }

    inner class OnScrollListener: RecyclerView.OnScrollListener() {
        override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
            super.onScrolled(recyclerView, dx, dy)

            val linearLayoutManager = recyclerView.layoutManager as LinearLayoutManager?
            if (!isLoading) {
                if (listItems.isNotEmpty() && linearLayoutManager != null && linearLayoutManager.findLastCompletelyVisibleItemPosition() == (listItems.size - 1)) {
                    //bottom of list!
                    loadData()
                }
            }
        }

        override fun onScrollStateChanged(recyclerView: RecyclerView, newState: Int) {
            super.onScrollStateChanged(recyclerView, newState)
        }
    }

    override fun onResume() {
        super.onResume()
    }

    override fun onPause() {
        super.onPause()
    }

    private fun loadData() {
        isLoading = true
        val db = Room.databaseBuilder(this@MyTasksFragment.context as Context, AppDB::class.java, "PbdDB").build()
        lifecycleScope.launch {
            val tasks = db.tasksDao().getTasks(20, offset)
            //remove the loading from the list
            if(listItems[listItems.size - 1] == null) {
                listItems.removeAt(listItems.size - 1)
                recyclerViewAdapter.notifyItemRemoved(listItems.size)
            }

            //insert it into the list
            tasks.forEach {
                val type = it.type.toInt()

                Log.i("pbdLog", "type: $type")
                listItems.add(
                    MyTaskListItemModel(
                        id = it.id,
                        organization = if(type == 0) { it.organization.toString() } else { it.subject },
                        remarks = it.remarks.toString(),
                        type = if (type == 0) "Visited" else "Other",
                        reason = if(type == 0) {
                            resources.getStringArray(R.array.reasons_for_visit)[it.reasonForVisit.toInt()]
                        } else {
                            null
                        },
                        createdAt = SimpleDateFormat("dd/MM/yy").format(Date(it.createdAt))
                    )
                )
                recyclerViewAdapter.notifyItemInserted(listItems.size - 1)
            }

            if(tasks.isNotEmpty()) {
                offset += tasks.size
            }

            if(tasks.size == 20) {
                listItems.add(null)
                recyclerViewAdapter.notifyItemInserted(listItems.size - 1)
            }

            isLoading = false
        }
    }

    private fun reloadData() {
        offset = 0
        listItems.clear()
        listItems.add(null)
        recyclerViewAdapter.notifyDataSetChanged()
        loadData()
    }

    private fun createNewTask(view: View) {
        Log.i("pbdLog", "Starting AddNewTaskActivity")
        startActivityForResult(Intent(activity, AddNewTaskActivity::class.java), 43)
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