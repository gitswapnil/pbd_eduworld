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
import android.widget.Toast
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.Observer
import androidx.lifecycle.lifecycleScope
import androidx.room.PrimaryKey
import androidx.room.Room
import androidx.work.*
import com.android.volley.DefaultRetryPolicy
import com.android.volley.Request
import com.android.volley.Response
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import kotlinx.coroutines.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import kotlin.coroutines.CoroutineContext

class MainActivity : AppCompatActivity(), LifecycleOwner {
    private fun createNotificationChannel() {
        // Create the NotificationChannel, but only on API 26+ because
        // the NotificationChannel class is new and not in the support library
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "PBD Navigation Service Channel"
            val descriptionText = "This is navigation notification description"
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(PbdExecutivesUtils().CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            // Register the channel with the system
            val notificationManager: NotificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun callWorkerOnce(onComplete: () -> Unit) {
        if(PbdExecutivesUtils().isInternetExists(applicationContext)) {
            val serverSyncRequest = OneTimeWorkRequestBuilder<ServerSyncWorker>().build()
            WorkManager.getInstance(this).enqueueUniqueWork("initialSync", ExistingWorkPolicy.REPLACE, serverSyncRequest)

            WorkManager.getInstance(this).getWorkInfosForUniqueWorkLiveData("initialSync")
                .observe(this, Observer<List<WorkInfo>>{ workInfos ->
//                    Log.i("pbdLog", "workInfos: $workInfos")
                    if (workInfos[0].state == WorkInfo.State.SUCCEEDED || workInfos[0].state == WorkInfo.State.FAILED) {
                        onComplete()
                    }
                })
        } else {
            onComplete()
        }
    }

    private fun gotoLogin() {
        stopServerSync()
        startActivity(Intent(this@MainActivity, LoginActivity::class.java))
        finishAffinity()       //remove the current activity from the activity stack so that back button makes it jump out of the application.
    }

    private fun gotoHome() {
        startServerSync()   //Start the background work that syncs the data to the server
        startActivity(Intent(this@MainActivity, HomeActivity::class.java))
        finishAffinity()       //remove the current activity from the activity stack so that back button makes it jump out of the application.
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.activity_main)
        createNotificationChannel()

        this.lifecycleScope.launch {
            val db: AppDB = Room.databaseBuilder(this@MainActivity, AppDB::class.java, "PbdDB").build()
            val apiKey: String? = db.userDetailsDao().getApiKey()

            Log.i("pbdLog", "apiKey is: $apiKey")
            if(apiKey == null) {
                gotoLogin()
                return@launch
            }

            //update and check the data
            callWorkerOnce {
                this@MainActivity.lifecycleScope.launch {
                    val newApiKey: String? = db.userDetailsDao().getApiKey()
                    Log.i("pbdLog", "newApiKey: $newApiKey")
                    if(newApiKey == null) {
                        gotoLogin()
                    } else {
                        gotoHome()
                    }
                }
            }

        }
    }

    private fun stopServerSync() {
        WorkManager.getInstance(applicationContext).cancelUniqueWork("serversync")
    }

    private fun startServerSync() {
        val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
//        val serverSyncRequest: OneTimeWorkRequest =
        val serverSyncRequest: PeriodicWorkRequest =
            PeriodicWorkRequestBuilder<ServerSyncWorker>(15, TimeUnit.MINUTES)
//                OneTimeWorkRequestBuilder<ServerSyncWorker>()
                .setConstraints(constraints)
                .build()

        WorkManager.getInstance(applicationContext)
            .enqueueUniquePeriodicWork("serversync", ExistingPeriodicWorkPolicy.KEEP, serverSyncRequest)
//            .enqueue(serverSyncRequest)
    }

    override fun onDestroy() {
        super.onDestroy()

        Log.i("pbdLog", "Main Activity destroyed")
    }
}
