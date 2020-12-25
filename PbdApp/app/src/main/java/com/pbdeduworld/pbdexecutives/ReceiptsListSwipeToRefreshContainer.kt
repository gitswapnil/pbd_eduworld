package com.pbdeduworld.pbdexecutives

import android.os.Bundle
import android.util.Log
import androidx.fragment.app.Fragment
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.FragmentTransaction
import androidx.fragment.app.commit
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.floatingactionbutton.FloatingActionButton
import kotlinx.android.synthetic.main.fragment_receipts_list_swipe_to_refresh_container.*

/**
 * A simple [Fragment] subclass.
 * Use the [ReceiptsListSwipeToRefreshContainer.newInstance] factory method to
 * create an instance of this fragment.
 */
class ReceiptsListSwipeToRefreshContainer : Fragment() {
    private lateinit var receiptsFragment: ReceiptsFragment

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
//        arguments?.let {
//            columnCount = it.getInt(ARG_COLUMN_COUNT)
//        }
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        // Inflate the layout for this fragment
        val view = inflater.inflate(
            R.layout.fragment_receipts_list_swipe_to_refresh_container,
            container,
            false
        )

        //        initialize the on swipe refresh listener
        view.findViewById<SwipeRefreshLayout>(R.id.swipe_to_refresh_layout).setOnRefreshListener {
            Log.i("pbdLog", "Refresh receipts called.")

            PbdExecutivesUtils.syncData(this.requireContext())   //Start the background work that syncs the data to the server
            receiptsFragment.reloadData()
        }

        childFragmentManager.commit {
            receiptsFragment = ReceiptsFragment.instance()
            Log.i("pbdLog", "ReceiptsFragment is initialized.")
            replace(R.id.swipe_to_refresh_layout, receiptsFragment)
        }

        return view
    }

    override fun onResume() {
        super.onResume()

        selected = true
    }

    override fun onPause() {
        super.onPause()

        selected = false
    }

    companion object {
        var selected: Boolean = false

        // TODO: Customize parameter initialization
        @JvmStatic
        fun newInstance(): ReceiptsListSwipeToRefreshContainer {
            return ReceiptsListSwipeToRefreshContainer().apply {
                Log.i("pbdLog", "Creating Instance Receipts Container")
            }
        }
    }
}