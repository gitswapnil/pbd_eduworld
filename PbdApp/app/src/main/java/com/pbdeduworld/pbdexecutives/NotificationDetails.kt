package com.pbdeduworld.pbdexecutives

import android.graphics.BitmapFactory
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.util.Log
import android.view.MenuItem
import android.view.View
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.room.Room
import kotlinx.android.synthetic.main.activity_notification_details.*
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch

class NotificationDetails : AppCompatActivity() {
    override fun onOptionsItemSelected(item: MenuItem) = when (item.itemId) {

        else -> {
            finish()
            super.onOptionsItemSelected(item)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_notification_details)

        setSupportActionBar(findViewById(R.id.notification_details_toolbar))
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        val notificationId = intent.getStringExtra("notificationId")
        Log.i("pbdLog", "notificationId: $notificationId")

        val db = Room.databaseBuilder(this, AppDB::class.java, "PbdDB").build()

        lifecycleScope.launch {
            val notification = db.notificationsDao().getNotification(notificationId)

            if(notification.type == "info") {
                nt_details_type.text = this@NotificationDetails.getString(R.string.info)
                nt_details_type_icon.setImageDrawable(ContextCompat.getDrawable(this@NotificationDetails, R.drawable.ic_baseline_info_12))
                nt_details_type.setTextColor(ContextCompat.getColor(this@NotificationDetails, R.color.information))
            } else {
                nt_details_type.text = this@NotificationDetails.getString(R.string.warning)
                nt_details_type_icon.setImageDrawable(ContextCompat.getDrawable(this@NotificationDetails, R.drawable.ic_outline_warning_12))
                nt_details_type.setTextColor(ContextCompat.getColor(this@NotificationDetails, R.color.warning))
            }

            nt_details_image.visibility = View.GONE
            if(notification.img != null) {
                nt_details_image.visibility = View.VISIBLE
                val bitmap = BitmapFactory.decodeByteArray(notification.img, 0, notification.img.size)
                nt_details_image.setImageBitmap(bitmap)
            }

            nt_details_text.text = notification.text
        }
    }
}