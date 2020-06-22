package com.example.pbdexecutives

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.adapter.FragmentStateAdapter

class TabsAdapter(activity: AppCompatActivity, tabCount: Int) : FragmentStateAdapter(activity) {
    private val itemsCount: Int = tabCount

    override fun getItemCount(): Int {
        return itemsCount
    }

    override fun createFragment(position: Int): Fragment {
        return when(position) {
            1 -> ReceiptsFragment()
            2 -> FollowUpsFragment()
            else -> MyTasksFragment()
        }
    }
}