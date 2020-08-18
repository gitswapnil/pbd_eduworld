package com.example.pbdexecutives

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
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
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import androidx.room.Room
import androidx.room.RoomDatabase
import com.google.android.material.floatingactionbutton.FloatingActionButton
import kotlinx.android.synthetic.main.fragment_follow_ups_list.*
import kotlinx.android.synthetic.main.fragment_my_tasks_list.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import kotlin.collections.ArrayList

/**
 * A fragment representing a list of Items.
 */
class FollowUpsFragment : Fragment() {
    private lateinit var searchReceiver: BroadcastReceiver
    private var linearLayoutManager: LinearLayoutManager = LinearLayoutManager(context)
    private lateinit var recyclerViewAdapter: FollowUpsRecyclerViewAdapter
    private lateinit var listItems: MutableList<FollowUpsListItemModel?>
    private var listForComparing: MutableList<FollowUpsWithJoins> = ArrayList()
    private var columnCount = 1
    private var limit = 20
    private var offset: Int = 0
    private var searchQuery: String = "%%"
    private var isLoading = false
    private var initializing = true
    private lateinit var db: AppDB

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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        db = Room.databaseBuilder(this@FollowUpsFragment.context as Context, AppDB::class.java, "PbdDB").build()

        arguments?.let {
            columnCount = it.getInt(ARG_COLUMN_COUNT)
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        val view = inflater.inflate(R.layout.fragment_follow_ups_list, container, false)

        // Set the adapter
        listItems = ArrayList()
        recyclerViewAdapter = FollowUpsRecyclerViewAdapter(listItems)
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

        follow_ups_list.addOnScrollListener(OnScrollListener())
        reloadData()
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

    private fun loadData() {
        if(isLoading) {
            return
        }

        isLoading = true
        lifecycleScope.launch {
            var loadingIndex: Int? = if(listItems[listItems.size - 1] == null) (listItems.size - 1) else null

            val followUps = db.followUpsDao().getFollowUps(limit = limit, offset = offset, searchQuery = searchQuery)
            if(followUps.isEmpty()) {
                isLoading = false
                return@launch
            }

            listForComparing.addAll(followUps)

            //insert it into the list
            listForComparing.forEach {
                listItems.add(
                    FollowUpsListItemModel(
                        id = it.id,
                        partyName = it.partyName,
                        cpName = it.cpName,
                        cpNumber = it.cpNumber.toString(),
                        reminderDate = if(it.reminderDate != null) {
                            "${if(Date().time < it.reminderDate) "green" else "red" },${SimpleDateFormat("dd/MM/yy").format(Date(it.reminderDate))}"
                        } else {
                            getString(R.string.reminder_not_set)
                        },
                        followUpFor = resources.getStringArray(R.array.reasons_for_visit)[it.followUpFor?.toInt()!!],
                        onClick = ::OnItemClick
                    )
                )
                recyclerViewAdapter.notifyItemInserted(listItems.size - 1)
            }

            Log.i("pbdLog", "listForComparison.isNotEmpty(): ${listForComparing.isNotEmpty()}")
            if(listForComparing.isNotEmpty()) {
                offset += listForComparing.size
            }

            //Remove the loading sign if present
            if(loadingIndex != null) {
                listItems.removeAt(loadingIndex)
                recyclerViewAdapter.notifyItemRemoved(loadingIndex)
            }

            if(listForComparing.size == limit) {
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
        listForComparing.clear()
        recyclerViewAdapter.notifyDataSetChanged()
        loadData()
    }

    override fun onResume() {
        super.onResume()
        selected = true

        if(activity!!.findViewById<FloatingActionButton>(R.id.floating_btn) != null) {
            activity!!.findViewById<FloatingActionButton>(R.id.floating_btn).visibility = View.GONE
        } else {
            searchReceiverMonitor()
        }

        if(initializing || isLoading) {
            initializing = false
            return
        }

        lifecycleScope.launch {
            val updatedList = db.followUpsDao().getFollowUps(limit = offset + limit, offset = 0, searchQuery = searchQuery)

            if(updatedList.size != listForComparing.size) {
                reloadData()
                return@launch
            }

            updatedList.forEachIndexed { index, followUpsWithJoins ->
                if( (followUpsWithJoins.taskId != listForComparing[index].taskId) ||
                    (followUpsWithJoins.partyId != listForComparing[index].partyId) ||
                    (followUpsWithJoins.cpName != listForComparing[index].cpName) ||
                    (followUpsWithJoins.cpNumber != listForComparing[index].cpNumber) ||
                    (followUpsWithJoins.followUpFor != listForComparing[index].followUpFor) ||
                    (followUpsWithJoins.reminderDate != listForComparing[index].reminderDate)) {
                    reloadData()
                    return@launch
                }
            }
        }
    }

    override fun onPause() {
        super.onPause()

        selected = false

        if(activity!!.findViewById<FloatingActionButton>(R.id.floating_btn) == null) {
            searchReceiverUnmonitor()
        }
    }

    inner class OnItemClick(private val followUpId: Long, private val position: Int): View.OnClickListener {
        override fun onClick(v: View?) {
            val intent = Intent(activity, FollowUpDetailActivity::class.java)
            intent.putExtra("followUpId", followUpId)
            intent.putExtra("position", position)
            startActivityForResult(intent, 21)
        }
    }

    companion object {
        var selected: Boolean = false

        // TODO: Customize parameter argument names
        const val ARG_COLUMN_COUNT = "column-count"

        // TODO: Customize parameter initialization
        @JvmStatic
        fun newInstance(columnCount: Int) =
            FollowUpsFragment().apply {
                Log.i("pbdLog", "Creating new Instance Follow up")
                arguments = Bundle().apply {
                    putInt(ARG_COLUMN_COUNT, columnCount)
                }
            }
    }
}