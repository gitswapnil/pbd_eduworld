package com.example.pbdexecutives

import android.content.Context
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
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import kotlin.collections.ArrayList

/**
 * A fragment representing a list of Items.
 */
class FollowUpsDetailedListFragment : Fragment() {
    private var followUpId: Long = 0
    private var columnCount = 1
    private lateinit var recyclerViewAdapter: FollowUpsDetailedListRecyclerViewAdapter
    private lateinit var listItems: MutableList<FollowUpDetailsListItemObject>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        arguments?.let {
            columnCount = it.getInt(ARG_COLUMN_COUNT)
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        val view = inflater.inflate(R.layout.follow_ups_detailed_list, container, false)
        listItems = ArrayList()
        recyclerViewAdapter = FollowUpsDetailedListRecyclerViewAdapter(listItems)

        // Set the adapter
        if (view is RecyclerView) {
            with(view) {
                layoutManager = LinearLayoutManager(context)
                adapter = recyclerViewAdapter
            }
        }

        followUpId = arguments!!.getLong("followUpId")

        return view
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        getData()
    }

    private fun getData() {
        val db = activity?.let { Room.databaseBuilder(it, AppDB::class.java, "PbdDB").build() }

        lifecycleScope.launch {
            val followUp = db?.followUpsDao()?.getFollowUp(id = followUpId) ?: return@launch
            val history: List<FollowUpsWithJoins> = db.followUpsDao().getFollowUpHistory(partyId = followUp.partyId)
            Log.i("pbdLog", "history: $history")

            if(history.size >= 2) {
                for (i in 1 until history.size) {
                    listItems.add(FollowUpDetailsListItemObject(
                        followUpFor = resources.getStringArray(R.array.reasons_for_visit)[history[i].followUpFor?.toInt()!!],
                        completedOn = SimpleDateFormat("dd/MM/yy").format(Date(history[i-1].createdAt)),
                        cpName = history[i].cpName,
                        cpNumber = history[i].cpNumber.toString()
                    ))
                }
            }

            recyclerViewAdapter.notifyDataSetChanged()
        }

    }

    override fun onActivityCreated(savedInstanceState: Bundle?) {
        super.onActivityCreated(savedInstanceState)
    }

    companion object {

        // TODO: Customize parameter argument names
        const val ARG_COLUMN_COUNT = "column-count"

        // TODO: Customize parameter initialization
        @JvmStatic
        fun newInstance(columnCount: Int) =
            FollowUpsDetailedListFragment().apply {
                arguments = Bundle().apply {
                    putInt(ARG_COLUMN_COUNT, columnCount)
                }
            }
    }
}