package com.example.pbdexecutives

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.view.MenuItem
import androidx.lifecycle.lifecycleScope
import androidx.room.Room
import kotlinx.android.synthetic.main.activity_follow_up_detail.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class FollowUpDetailActivity : AppCompatActivity() {
    private var followUpId: Long = 0
    private var itemPosition: Int = -1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_follow_up_detail)

        followUpId = intent.getLongExtra("followUpId", 0)
        itemPosition = intent.getIntExtra("position", -1)

        setSupportActionBar(findViewById(R.id.follow_up_details_toolbar))
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        val fragment: FollowUpsDetailedListFragment = FollowUpsDetailedListFragment.newInstance(1)
        val bundle: Bundle = Bundle()
        bundle.putLong("followUpId", followUpId)
        fragment.arguments = bundle

        // check is important to prevent activity from attaching the fragment if already its attached
        if (savedInstanceState == null) {
            supportFragmentManager
                .beginTransaction()
                .add(R.id.fragment_follow_up_details_container, fragment, "follow_up_detailed_list_fragment")
                .commit()
        }
    }

    override fun onResume() {
        super.onResume()

        loadData()
    }

    fun loadData() {
        val db = Room.databaseBuilder(this, AppDB::class.java, "PbdDB").build()

        lifecycleScope.launch {
//            Log.i("pbdLog", "followUpId: $followUpId")
            val followUp = db.followUpsDao().getFollowUp(id = followUpId)

//            Log.i("pbdLog", "followUp: $followUp")
            if(followUp != null) {
                party_name.text = followUp.partyName
                party_address.text = followUp.partyAddress
                cp_number.text = followUp.cpName
                cp_number.text = followUp.cpNumber.toString()
                reminder_date.text = if(followUp.reminderDate != null) SimpleDateFormat("dd/MM/yy").format(Date(followUp.reminderDate)) else null
                follow_up_for.text = if(followUp.followUpFor != null) {
                    resources.getStringArray(R.array.reasons_for_visit)[followUp.followUpFor.toInt()]
                } else null
            }
        }
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (item.itemId == android.R.id.home) {
            finish()
            return true
        }

        return super.onOptionsItemSelected(item)
    }
}