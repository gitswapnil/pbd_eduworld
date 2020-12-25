package com.pbdeduworld.pbdexecutives

import android.app.Activity.RESULT_OK
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.room.Room
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.floatingactionbutton.FloatingActionButton
import kotlinx.android.synthetic.main.fragment_my_tasks_list.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import kotlin.collections.ArrayList


/**
 * A fragment representing a list of Items.
 */
class MyTasksFragment : Fragment() {
    private lateinit var searchReceiver: BroadcastReceiver
    private var linearLayoutManager: LinearLayoutManager = LinearLayoutManager(context)
    private lateinit var recyclerViewAdapter: MyTasksRecyclerViewAdapter
    private lateinit var listItems: MutableList<MyTaskListItemModel?>
    private var columnCount = 1
    private var limit = 20
    private var offset: Int = 0
    private var searchQuery: String = "%%"
    private var isLoading = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        arguments?.let {
            columnCount = it.getInt(ARG_COLUMN_COUNT)
        }

    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        val view = inflater.inflate(R.layout.fragment_my_tasks_list, container, false)
        //change the action button's onclick
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

    private fun searchReceiverMonitor() {
        val filter = IntentFilter(SearchActivity.actionSearchQueryBroadcast)

        searchReceiver = object : BroadcastReceiver() {         //receiver always called only when the duty switch is OFF.
            override fun onReceive(context: Context, intent: Intent) {
                val sQuery = intent.getStringExtra(SearchActivity.searchQuery)

                searchQuery = "%${sQuery}%"
                Log.i("pbdLog", "Search Query: $searchQuery")
                reloadData()
            }
        }

        activity?.let { LocalBroadcastManager.getInstance(it).registerReceiver(searchReceiver, filter) }
    }

    private fun searchReceiverUnmonitor() {
        activity?.let { LocalBroadcastManager.getInstance(it).unregisterReceiver(searchReceiver) }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

//        Log.i("pbdLog", "requestCode: $requestCode, resultCode: $resultCode, data: $data")
        if (requestCode == 43 && resultCode == RESULT_OK && data != null) {
            reloadData()
        } else if(requestCode == 54 && resultCode == RESULT_OK && data != null) {
            val editTaskId = data.getLongExtra("taskId", 0)
            val editItemType = data.getIntExtra("type", -1)
            val editItemPartyName = data.getStringExtra("partyName")
            val editItemRemarks = data.getStringExtra("remarks")
            val editItemReasonForVisit = data.getIntExtra("reasonForVisit", -1)
            val isItemRemoved = data.getBooleanExtra("removed", false)

            if(editTaskId != 0.toLong()) {
                val index = listItems.indexOfFirst { it?.id == editTaskId }
                if(isItemRemoved) {
                    listItems.removeAt(index)
                    recyclerViewAdapter.notifyItemRemoved(index)
                } else {
                    listItems[index]?.id = editTaskId
                    listItems[index]?.party = editItemPartyName.toString()
                    listItems[index]?.remarks = editItemRemarks
                    listItems[index]?.type = if (editItemType == 0) "Visited" else "Other"
                    listItems[index]?.reason = if(editItemType == 0) {
                        resources.getStringArray(R.array.reasons_for_visit)[editItemReasonForVisit.toInt()]
                    } else null

                    recyclerViewAdapter.notifyItemChanged(index)
                }
            }
        }
    }

    inner class OnScrollListener: RecyclerView.OnScrollListener() {
        override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
            super.onScrolled(recyclerView, dx, dy)

            if(dy == 0) {
                return
            }

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
        selected = true

        if(requireActivity().findViewById<FloatingActionButton>(R.id.floating_btn) != null) {
            requireActivity().findViewById<FloatingActionButton>(R.id.floating_btn).visibility = View.VISIBLE
            requireActivity().findViewById<FloatingActionButton>(R.id.floating_btn).setOnClickListener { view ->
                createNewTask(view)
            }
        } else {
            searchReceiverMonitor()
        }
    }

    override fun onPause() {
        super.onPause()
        selected = false

        if(requireActivity().findViewById<FloatingActionButton>(R.id.floating_btn) != null) {
            requireActivity().findViewById<FloatingActionButton>(R.id.floating_btn).setOnClickListener(null)
        } else {
            searchReceiverUnmonitor()
        }
    }

    private fun loadData() {
        if(isLoading) {
            return
        }

        isLoading = true
        val db = Room.databaseBuilder(this@MyTasksFragment.context as Context, AppDB::class.java, "PbdDB").build()
        lifecycleScope.launch {
            var loadingIndex: Int? = if(listItems[listItems.size - 1] == null) (listItems.size - 1) else null

            val tasks = db.tasksDao().getTasks(limit, offset, searchQuery)
            if(tasks.isEmpty()) {
                isLoading = false
                if (loadingIndex != null) {
                    listItems.removeAt(loadingIndex)
                    recyclerViewAdapter.notifyItemRemoved(loadingIndex)
                }
                return@launch
            }

            //insert it into the list
            tasks.forEach {
                val type = it.type.toInt()

                listItems.add(
                    MyTaskListItemModel(
                        id = it.id,
                        party = if(type == 0) { it.partyName.toString() } else { it.subject },
                        remarks = it.remarks.toString(),
                        type = if (type == 0) "Visited" else "Other",
                        reason = if(type == 0) {
                            resources.getStringArray(R.array.reasons_for_visit)[it.reasonForVisit.toInt()]
                        } else null,
                        createdAt = SimpleDateFormat("dd/MM/yy").format(Date(it.createdAt)),
                        onClick = ::OnItemClick
                    )
                )
                recyclerViewAdapter.notifyItemInserted(listItems.size - 1)
            }

            if(tasks.isNotEmpty()) {
                offset += tasks.size
            }

            //Remove the loading sign if present
            if(loadingIndex != null) {
                listItems.removeAt(loadingIndex)
                recyclerViewAdapter.notifyItemRemoved(loadingIndex)
            }

            if(tasks.size == limit) {
                listItems.add(null)
                recyclerViewAdapter.notifyItemInserted(listItems.size - 1)
            }

            isLoading = false

            //After loading everything switch off the refresh circle from swipe to refresh layout
            val swipeToRefreshLayout = requireActivity().findViewById<SwipeRefreshLayout>(R.id.swipe_refresh_layout)
            if(swipeToRefreshLayout !== null) {
                swipeToRefreshLayout.isRefreshing = false
            }
        }
    }

    fun reloadData() {
        offset = 0
        listItems.clear()
        listItems.add(null)
        recyclerViewAdapter.notifyDataSetChanged()
        loadData()
    }

    private fun createNewTask(view: View) {
        startActivityForResult(Intent(activity, AddNewTaskActivity::class.java), 43)
    }

    inner class OnItemClick(private val taskId: Long): View.OnClickListener {
        override fun onClick(v: View?) {
            val intent = Intent(activity, AddNewTaskActivity::class.java)
            intent.putExtra("taskId", taskId)
            startActivityForResult(intent, 54)
        }
    }

    companion object {
        var selected: Boolean = false
        lateinit var ref: MyTasksFragment

        // TODO: Customize parameter argument names
        const val ARG_COLUMN_COUNT = "column-count"

        // TODO: Customize parameter initialization
        @JvmStatic
        fun newInstance(columnCount: Int): MyTasksFragment {
            ref = MyTasksFragment().apply {
//                Log.i("pbdLog", "Creating new Instance My Task")
                arguments = Bundle().apply {
                    putInt(ARG_COLUMN_COUNT, columnCount)
                }
            }
            return ref
        }
    }
}