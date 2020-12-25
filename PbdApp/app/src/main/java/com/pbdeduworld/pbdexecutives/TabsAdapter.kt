package com.pbdeduworld.pbdexecutives

import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.viewpager2.adapter.FragmentStateAdapter

class TabsAdapter(activity: AppCompatActivity, tabCount: Int) : FragmentStateAdapter(activity) {
    private val itemsCount: Int = tabCount

    override fun getItemCount(): Int {
        return itemsCount
    }

    override fun createFragment(position: Int): Fragment {
        return when(position) {
            1 -> ReceiptsListSwipeToRefreshContainer.newInstance()
            2 -> FollowUpsFragment.newInstance(1)
            else -> MyTasksFragment.newInstance(1)
        }
    }
}