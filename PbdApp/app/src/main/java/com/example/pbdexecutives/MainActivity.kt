package com.example.pbdexecutives

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.util.Log
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.room.Room
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity(), LifecycleOwner {
    private fun createNotificationChannel() {
        // Create the NotificationChannel, but only on API 26+ because
        // the NotificationChannel class is new and not in the support library
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "PBD Navigation Service Channel";
            val descriptionText = "This is navigation notification description"
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(PbdExecutivesUtils().CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            // Register the channel with the system
            val notificationManager: NotificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel);
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        createNotificationChannel();

        val self = this;
        this.lifecycleScope.launch {
            val db = Room.databaseBuilder(self, AppDB::class.java, "PbdDB").build();
            var apiKey: String = db.userDetailsDao().getApiKey();
            Log.i("pbdLog", "apiKey is: $apiKey");

            var intent: Intent = if(apiKey == null) {    //if the apiKey is not found in the database then go to the login page
                Intent(self, LoginActivity::class.java);
            } else {        //else go to the home page
                Intent(self, HomeActivity::class.java);
            }
            startActivity(intent);
        }
    }
}
