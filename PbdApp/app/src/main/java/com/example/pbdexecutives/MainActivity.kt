package com.example.pbdexecutives

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.os.Handler
import android.util.Log
import androidx.room.Room

class MainActivity : AppCompatActivity() {
    private fun createNotificationChannel() {
        // Create the NotificationChannel, but only on API 26+ because
        // the NotificationChannel class is new and not in the support library
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "PBD Navigation Service Channel";
            val descriptionText = "This is navigation notification description"
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(PbdExecutives().CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            // Register the channel with the system
            val notificationManager: NotificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel);
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        createNotificationChannel();

        val db = Room.databaseBuilder(applicationContext, AppDB::class.java, "PbdDB").build();
        val handler = Handler();
        Thread {
            var apiKey: String = "";
            db.userDetailsDao().getApiKey().forEach {       //search for the existing apiKey
                Log.i("pbdLog", "apiKey is: ${it}");
                apiKey = it;
            }

            handler.postDelayed({
                var intent: Intent = if(apiKey == "") {    //if the apiKey is not found in the database then go to the login page
                    Intent(this, LoginActivity::class.java);
                } else {        //else go to the home page
                    Intent(this, HomeActivity::class.java);
                }
                startActivity(intent);
            }, 1000);
        }.start();
    }
}
