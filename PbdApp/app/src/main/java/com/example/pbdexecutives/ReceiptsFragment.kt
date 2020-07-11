package com.example.pbdexecutives

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.room.Room
import com.google.android.material.floatingactionbutton.FloatingActionButton
import kotlinx.android.synthetic.main.fragment_receipts_list.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

/**
 * A fragment representing a list of Items.
 */
class ReceiptsFragment : Fragment() {
    private var linearLayoutManager: LinearLayoutManager = LinearLayoutManager(context)
    private lateinit var recyclerViewAdapter: ReceiptsRecyclerViewAdapter
    private lateinit var listItems: MutableList<ReceiptsListItemModel?>
    private var listForComparing: MutableList<ReceiptsWithJoins> = ArrayList()
    private var columnCount = 1
    private var limit = 20
    private var offset: Int = 0
    private var isLoading = false
    private var initializing = true
    private lateinit var db: AppDB

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        db = Room.databaseBuilder(this@ReceiptsFragment.context as Context, AppDB::class.java, "PbdDB").build()

        arguments?.let {
            columnCount = it.getInt(ARG_COLUMN_COUNT)
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        val view = inflater.inflate(R.layout.fragment_receipts_list, container, false)

        // Set the adapter
        listItems = ArrayList()
        recyclerViewAdapter = ReceiptsRecyclerViewAdapter(this, listItems)
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

        receipts_list.addOnScrollListener(OnScrollListener())
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
            //remove the loading from the list
            if(listItems[listItems.size - 1] == null) {
                listItems.removeAt(listItems.size - 1)
                recyclerViewAdapter.notifyItemRemoved(listItems.size)
            }

            val userDetails =
                withContext(Dispatchers.Default) {
                    db.userDetailsDao().getCurrentUser();
                }

            val receipts = db.receiptsDao().getReceipts(limit = limit, offset = offset)
            if(receipts.isEmpty()) {
                isLoading = false
                return@launch
            }

            listForComparing.addAll(receipts)

            //insert it into the list
            listForComparing.forEach {
                listItems.add(
                    ReceiptsListItemModel(
                        id = it.id,
                        receiptNo = "${userDetails.receiptSeries}${it.receiptNo}",
                        partyName = it.partyName,
                        amount = "${getString(R.string.rupee)} ${it.amount.toBigDecimal().toPlainString()}",
                        cpName = it.cpName,
                        cpNumber = it.cpNumber,
                        createdAt = SimpleDateFormat("dd/MM/yy").format(it.createdAt),
                        onClick = ::OnItemClick
                    )
                )
                recyclerViewAdapter.notifyItemInserted(listItems.size - 1)
            }

            Log.i("pbdLog", "listForComparison.isNotEmpty(): ${listForComparing.isNotEmpty()}")
            if(listForComparing.isNotEmpty()) {
                offset += listForComparing.size
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
        activity!!.findViewById<FloatingActionButton>(R.id.floating_btn).visibility = View.VISIBLE
        activity!!.findViewById<FloatingActionButton>(R.id.floating_btn).setOnClickListener { view ->
            createNewReceipt(view)
        }

        if(initializing || isLoading) {
            initializing = false
            return
        }

        lifecycleScope.launch {
            val updatedList = db.receiptsDao().getReceipts(limit = offset + limit, offset = 0)

            if(updatedList.size != listForComparing.size) {
                reloadData()
                return@launch
            }

            updatedList.forEachIndexed { index, receiptsWithJoins ->
                if( (receiptsWithJoins.serverId != listForComparing[index].serverId) ||
                    (receiptsWithJoins.partyName != listForComparing[index].partyName) ||
                    (receiptsWithJoins.partyAddress != listForComparing[index].partyAddress) ||
                    (receiptsWithJoins.cpName != listForComparing[index].cpName) ||
                    (receiptsWithJoins.cpNumber != listForComparing[index].cpNumber) ||
                    (receiptsWithJoins.createdAt != listForComparing[index].createdAt)) {
                    reloadData()
                    return@launch
                }
            }
        }
    }

    override fun onPause() {
        super.onPause()
        activity!!.findViewById<FloatingActionButton>(R.id.floating_btn).setOnClickListener(null)
    }

    private fun createNewReceipt(view: View) {
        startActivityForResult(Intent(activity, AddNewReceiptActivity::class.java), 89)
    }

    inner class OnItemClick(private val receiptId: Long, private val position: Int): View.OnClickListener {
        override fun onClick(v: View?) {
            val intent = Intent(activity, ReceiptPreviewActivity::class.java)
            intent.putExtra("receiptId", receiptId)
            intent.putExtra("position", position)
            startActivityForResult(intent, 41)
        }
    }

    companion object {

        // TODO: Customize parameter argument names
        const val ARG_COLUMN_COUNT = "column-count"

        // TODO: Customize parameter initialization
        @JvmStatic
        fun newInstance(columnCount: Int) =
            ReceiptsFragment().apply {
                Log.i("pbdLog", "Creating new Instance Receipts")
                arguments = Bundle().apply {
                    putInt(ARG_COLUMN_COUNT, columnCount)
                }
            }
    }
}