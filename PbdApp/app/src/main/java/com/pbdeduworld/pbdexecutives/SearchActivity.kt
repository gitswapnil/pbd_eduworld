package com.pbdeduworld.pbdexecutives

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.Menu
import android.view.MenuInflater
import android.view.MenuItem
import android.widget.SearchView
import androidx.annotation.IdRes
import androidx.annotation.NonNull
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.localbroadcastmanager.content.LocalBroadcastManager


class SearchActivity : AppCompatActivity() {
    companion object {
        const val actionSearchQueryBroadcast: String = "${android.provider.ContactsContract.Directory.PACKAGE_NAME}.broadcastSearchQueryUpdate"
        const val searchQuery: String = "${android.provider.ContactsContract.Directory.PACKAGE_NAME}.searchQuery"
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        val inflater: MenuInflater = menuInflater
        inflater.inflate(R.menu.search_menu, menu)

        //         Associate searchable configuration with the SearchView
        val searchView = menu.findItem(R.id.app_bar_search).actionView as SearchView
        searchView.maxWidth = Integer.MAX_VALUE
        searchView.queryHint = getString(R.string.search_hint)
        searchView.onActionViewExpanded()

        searchView.setOnQueryTextListener(object: SearchView.OnQueryTextListener {
            override fun onQueryTextChange(newText: String?): Boolean {
//                Log.i("pbdLog", "newText: $newText")
                if(newText == "") {
                    broadcastSearchQuery("")
                }

                return false
            }

            override fun onQueryTextSubmit(query: String?): Boolean {
                if(query != null) {
                    broadcastSearchQuery(query)
                } else {
                    broadcastSearchQuery("")
                }

                return false
            }
        })

        return true
    }

    private fun broadcastSearchQuery(query: String) {
        val intent = Intent(actionSearchQueryBroadcast)
        intent.putExtra(searchQuery, query)

        Log.i("pbdLog", "Sending the broadcast value: $query")
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent)
    }

    override fun onOptionsItemSelected(item: MenuItem) = when (item.itemId) {
        R.id.app_bar_search -> {
            true
        }

        else -> {
            finish()
            super.onOptionsItemSelected(item)
        }
    }

    private fun addFragment(
        @IdRes containerViewId: Int,
        @NonNull fragment: Fragment,
        @NonNull fragmentTag: String?
    ) {
        supportFragmentManager
            .beginTransaction()
            .add(containerViewId, fragment, fragmentTag)
            .disallowAddToBackStack()
            .commit()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_search)

        setSupportActionBar(findViewById(R.id.search_toolbar))
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        val selectedTab = intent.getIntExtra("selectedTab", 0)

        when(selectedTab) {
            0 -> {
                addFragment(R.id.search_fragment_container, MyTasksFragment.newInstance(1), "MyTasks")
                true
            }

            1 -> {
                addFragment(R.id.search_fragment_container, ReceiptsFragment.instance(), "Receipts")
                true
            }

            else -> {
                addFragment(R.id.search_fragment_container, FollowUpsFragment.newInstance(1), "FollowUps")
                true
            }
        }
    }
}