package com.example.pbdexecutives

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.view.MenuItem
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.localbroadcastmanager.content.LocalBroadcastManager


class ProfileActivity : AppCompatActivity() {
    private lateinit var userLoginStateReceiver: BroadcastReceiver

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile)

        setSupportActionBar(findViewById(R.id.profile_toolbar))
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
    }

    override fun onResume() {
        super.onResume()

        userLoginStatusMonitor()
    }

    override fun onPause() {
        super.onPause();

        userLoginStatusUnonitor()
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (item.itemId == android.R.id.home) {
            finish();
            return true;
        }

        return super.onOptionsItemSelected(item);
    }

    private fun userLoginStatusMonitor() {
        val filter = IntentFilter(PbdExecutivesUtils().actionUserLoggedOut)
        val newIntent = Intent(this, MainActivity::class.java)        //go to home activity after save

        userLoginStateReceiver = object : BroadcastReceiver() {         //receiver always called only when the duty switch is OFF.
            override fun onReceive(context: Context, intent: Intent) {
                startActivity(newIntent)
                finishAffinity()
            }
        }

        LocalBroadcastManager.getInstance(this).registerReceiver(userLoginStateReceiver, filter)
    }

    private fun userLoginStatusUnonitor() {
        LocalBroadcastManager.getInstance(this).unregisterReceiver(userLoginStateReceiver)
    }

    fun logout(view: View) {
        PbdExecutivesUtils().logoutUser(applicationContext)
    }

}