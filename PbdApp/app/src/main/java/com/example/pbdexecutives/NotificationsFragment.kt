package com.example.pbdexecutives

import android.content.Context
import android.content.Intent
import android.os.Bundle
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
import kotlinx.android.synthetic.main.fragment_notifications_list.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

/**
 * A fragment representing a list of Items.
 */
class NotificationsFragment : Fragment() {
    private lateinit var recyclerViewAdapter: NotificationsRecyclerViewAdapter
    private lateinit var listItems: MutableList<NotificationsListItemModel?>
    private var limit = 20
    private var offset: Int = 0
    private var isLoading = false
    private var columnCount = 1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        arguments?.let {
            columnCount = it.getInt(ARG_COLUMN_COUNT)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_notifications_list, container, false)
        listItems = ArrayList()
        recyclerViewAdapter = NotificationsRecyclerViewAdapter(listItems)

        // Set the adapter
        if (view is RecyclerView) {
            with(view) {
                layoutManager = LinearLayoutManager(context)
                adapter = recyclerViewAdapter
            }
        }
        return view
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        notifications_list.addOnScrollListener(OnScrollListener())
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
        val db = Room.databaseBuilder(this@NotificationsFragment.context as Context, AppDB::class.java, "PbdDB").build()
        lifecycleScope.launch {
            var loadingIndex: Int? = if(listItems[listItems.size - 1] == null) (listItems.size - 1) else null

            val notifications = db.notificationsDao().getNotifications(limit, offset)
            if(notifications.isEmpty()) {
                isLoading = false
                return@launch
            }

            //insert it into the list
            notifications.forEach {
                listItems.add(
                    NotificationsListItemModel(
                        id = it.id,
                        text = it.text,
                        type = it.type,
                        image = it.img,
                        createdAt = SimpleDateFormat("dd/MM/yy").format(Date(it.createdAt)),
                        onClick = ::OnItemClick
                    )
                )
                recyclerViewAdapter.notifyItemInserted(listItems.size - 1)
            }

            if(notifications.isNotEmpty()) {
                offset += notifications.size
            }

            //Remove the loading sign if present
            if(loadingIndex != null) {
                listItems.removeAt(loadingIndex)
                recyclerViewAdapter.notifyItemRemoved(loadingIndex)
            }

            if(notifications.size == limit) {
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

    inner class OnItemClick(private val notificationId: String): View.OnClickListener {
        override fun onClick(v: View?) {
            val intent = Intent(activity, NotificationDetails::class.java)
            intent.putExtra("notificationId", notificationId)
            startActivity(intent)
        }
    }

    companion object {

        // TODO: Customize parameter argument names
        const val ARG_COLUMN_COUNT = "column-count"

        // TODO: Customize parameter initialization
        @JvmStatic
        fun newInstance(columnCount: Int) =
            NotificationsFragment().apply {
                arguments = Bundle().apply {
                    putInt(ARG_COLUMN_COUNT, columnCount)
                }
            }
    }
}