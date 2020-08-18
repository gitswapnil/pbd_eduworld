package com.example.pbdexecutives

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.view.MenuItem

class NotificationsActivity : AppCompatActivity() {
    override fun onOptionsItemSelected(item: MenuItem) = when (item.itemId) {

        else -> {
            finish()
            super.onOptionsItemSelected(item)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_notifications)

        setSupportActionBar(findViewById(R.id.notifications_toolbar))
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
    }


}