package com.example.pbdexecutives

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.os.Build
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.os.Handler
import android.util.Log
import android.widget.Toast
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.room.Room
import androidx.work.*
import com.android.volley.DefaultRetryPolicy
import com.android.volley.Request
import com.android.volley.Response
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.concurrent.TimeUnit

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
            val apiKey: String? = db.userDetailsDao().getApiKey();

            Log.i("pbdLog", "apiKey is: $apiKey");
            val handler = Handler();
            handler.postDelayed({
                if(apiKey == null) {    //if the apiKey is not found in the database then go to the login page
                    startActivity(Intent(self, LoginActivity::class.java));
                    stopServerSync();
                } else {        //else go to the home page and start syncing with the server
                    startActivity(Intent(self, HomeActivity::class.java));
                    startServerSync()   //Start the background work that syncs the data to the server
                }
            }, 1000);
        }
    }

    private fun stopServerSync() {
        WorkManager.getInstance(applicationContext).cancelUniqueWork("serversync");
    }

    private fun startServerSync() {
        val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        val serverSyncRequest: OneTimeWorkRequest =
//        val serverSyncRequest: PeriodicWorkRequest =
//            PeriodicWorkRequestBuilder<ServerSyncWorker>(15, TimeUnit.MINUTES)
                OneTimeWorkRequestBuilder<ServerSyncWorker>()
                .setConstraints(constraints)
                .build()

        WorkManager.getInstance(applicationContext)
//            .enqueueUniquePeriodicWork("serversync", ExistingPeriodicWorkPolicy.KEEP, serverSyncRequest)
            .enqueue(serverSyncRequest)
    }
}
