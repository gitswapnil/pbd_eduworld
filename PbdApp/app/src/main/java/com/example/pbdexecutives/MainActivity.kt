package com.example.pbdexecutives

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.os.Handler
import android.os.StrictMode
import android.util.Base64
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
import com.google.android.gms.tasks.OnCompleteListener
import com.google.firebase.iid.FirebaseInstanceId
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.coroutines.*
import org.json.JSONObject
import java.text.DecimalFormat
import java.util.*
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
            val channel = NotificationChannel(PbdExecutivesUtils.CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            // Register the channel with the system
            val notificationManager: NotificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    data class TasksResponseObject (
        @SerializedName("_id") val _id: String,
        @SerializedName("type") val type: Short,
        @SerializedName("partyId") val partyId: String,
        @SerializedName("cpName") val cpName: String,
        @SerializedName("cpNumber") val cpNumber: String,
        @SerializedName("reason") val reason: Short,
        @SerializedName("doneWithTask") val doneWithTask: Boolean,
        @SerializedName("reminder") val reminder: Boolean,
        @SerializedName("remarks") val remarks: String,
        @SerializedName("subject") val subject: String,
        @SerializedName("createdAt") val createdAt: Long
    )

    data class ReceiptsResponseObject (
        @SerializedName("_id") val _id: String,
        @SerializedName("receiptNo") val receiptNo: Long,
        @SerializedName("partyId") val partyId: String,
        @SerializedName("cpName") val cpName: String,
        @SerializedName("cpNumber") val cpNumber: String,
        @SerializedName("cpEmail") val cpEmail: String,
        @SerializedName("amount") val amount: String,
        @SerializedName("paidBy") val paidBy: Byte,
        @SerializedName("chequeNo") val chequeNo: String?,
        @SerializedName("ddNo") val ddNo: String?,
        @SerializedName("bankName") val bankName: String?,
        @SerializedName("bankBranch") val bankBranch: String?,
        @SerializedName("payment") val payment: Byte,
        @SerializedName("createdAt") val createdAt: Long
    )

    data class FollowUpsResponseObject (
        @SerializedName("_id") val _id: String,
        @SerializedName("partyId") val partyId: String,
        @SerializedName("taskId") val taskId: String,
        @SerializedName("reminderDate") val reminderDate: Long,
        @SerializedName("followUpFor") val followUpFor: Short,
        @SerializedName("createdAt") val createdAt: Long
    )

    data class PartyResponseObject (
        @SerializedName("_id") val _id: String,
        @SerializedName("code") val code: String,
        @SerializedName("name") val name: String,
        @SerializedName("cNumber") val cNumber: String,
        @SerializedName("address") val address: String,
        @SerializedName("updatedAt") val updatedAt: Long
    )

    data class NotificationsResponseObject (
        @SerializedName("_id") val _id: String,
        @SerializedName("type") val type: String,
        @SerializedName("text") val text: String,
        @SerializedName("img") val img: String?,
        @SerializedName("createdAt") val createdAt: Long
    )

    data class ResponseObject(
        @SerializedName("tasks") val tasks: List<TasksResponseObject>,
        @SerializedName("receipts") val receipts: List<ReceiptsResponseObject>,
        @SerializedName("followUps") val followUps: List<FollowUpsResponseObject>,
        @SerializedName("parties") val parties: List<PartyResponseObject>,
        @SerializedName("notifications") val notifications: List<NotificationsResponseObject>,
        @SerializedName("dataLength") val dataLength: Int
    )

    private fun restoreData(apiKey: String, offset: Long, limit: Int, callback: () -> Unit) {
        val jsonRequestObject: JSONObject = JSONObject("{\"apiKey\": \"${apiKey}\", \"offset\": $offset, \"limit\": $limit}")

        PbdExecutivesUtils.sendData(
            this,
            "restoredata",
            jsonRequestObject,
            { code: Int, response: Any ->
                this.lifecycleScope.launch {
                    val db = Room.databaseBuilder(this@MainActivity, AppDB::class.java, "PbdDB").build()
//                    Log.i("pbdLog", "response: $response")
                    val responseObject = Gson().fromJson(
                        response.toString(),
                        ResponseObject::class.java
                    );      //convert the response back into JSON Object from the response string
//                    Log.i("pbdLog", "responseObject: $responseObject")

                    if(responseObject.tasks != null && responseObject.tasks.isNotEmpty()) {
                        responseObject.tasks.forEach { task ->
//                            Log.i("pbdLog", "task: $task")
                            db.tasksDao().addTask(Tasks(
                                type = task.type,
                                partyId = task.partyId,
                                contactPersonName = task.cpName,
                                contactPersonNumber = task.cpNumber,
                                reasonForVisit = task.reason,
                                doneWithTask = task.doneWithTask,
                                reminder = task.reminder,
                                remarks = if(task.remarks == null) "" else task.remarks,
                                subject = if(task.subject == null) "" else task.subject,
                                serverId = task._id,
                                synced = true,
                                createdAt = task.createdAt
                            ))
                        }
                    }

                    if(responseObject.receipts != null && responseObject.receipts.isNotEmpty()) {
                        responseObject.receipts.forEach { receipt ->
//                            Log.i("pbdLog", "receipts: $receipt")
                            db.receiptsDao().addReceipt(Receipts(
                                receiptNo = receipt.receiptNo,
                                partyId = receipt.partyId,
                                cpName = receipt.cpName,
                                cpNumber = receipt.cpNumber,
                                cpEmail = receipt.cpEmail,
                                amount = receipt.amount,
                                paidBy = receipt.paidBy,
                                chequeNo = receipt.chequeNo,
                                ddNo = receipt.ddNo,
                                bankName = receipt.bankName,
                                bankBranch = receipt.bankBranch,
                                payment = receipt.payment,
                                serverId = receipt._id,
                                createdAt = receipt.createdAt
                            ))
                        }
                    }

                    if(responseObject.followUps != null && responseObject.followUps.isNotEmpty()) {
                        responseObject.followUps.forEach { followUp ->
//                            Log.i("pbdLog", "followUp: $followUp")
                            val task = db.tasksDao().getTaskFromServerId(followUp.taskId)
                            db.followUpsDao().addFollowUp(FollowUps(
                                reminderDate = followUp.reminderDate,
                                partyId = followUp.partyId,
                                taskId = task.id,
                                followUpFor = followUp.followUpFor,
                                serverId = followUp._id,
                                synced = true,
                                createdAt = followUp.createdAt
                            ))
                        }
                    }

                    if(responseObject.parties != null && responseObject.parties.isNotEmpty()) {
                        var partiesToBeAdded: List<Parties> = responseObject.parties.map { party -> Parties(
                                id = party._id,
                                code = party.code,
                                name = party.name,
                                cNumber = party.cNumber,
                                address = party.address,
                                updatedAt = party.updatedAt
                            )
                        }
                        db.partiesDao().addParties(partiesToBeAdded)
                    }

                    if(responseObject.notifications != null && responseObject.notifications.isNotEmpty()) {
                        val notificationsToBeAdded: List<Notifications> = responseObject.notifications.map { notification -> Notifications(
                                id = notification._id,
                                type = notification.type,
                                text = notification.text,
                                img = if(notification.img != null) Base64.decode(notification.img, Base64.DEFAULT) else ByteArray(0x0),
                                seen = true,
                                createdAt = notification.createdAt
                            )
                        }
                        db.notificationsDao().addNotifications(notificationsToBeAdded)
                    }

                    Log.i("pbdLog", "responseObject.dataLength: ${responseObject.dataLength}, limit: $limit")
                    if(responseObject.dataLength < limit) {
                        callback()
                    } else {
                        restoreData(apiKey, offset + limit, limit) { callback() }
                    }
                }
            },
            { code: Int, error: Any ->
                Toast.makeText(this, error.toString(), Toast.LENGTH_LONG).show()
            },
            DefaultRetryPolicy(5000, 0, 1f)
        )
    }

    private fun syncOnce(onComplete: () -> Unit) {
        val serverSyncRequest = OneTimeWorkRequestBuilder<ServerSyncWorker>().build()
        WorkManager.getInstance(this).enqueueUniqueWork("initialSync", ExistingWorkPolicy.REPLACE, serverSyncRequest)

        WorkManager.getInstance(this).getWorkInfosForUniqueWorkLiveData("initialSync")
            .observe(this, Observer<List<WorkInfo>>{ workInfos ->
                Log.i("pbdLog", "workInfos: $workInfos")
                if (workInfos[0].state == WorkInfo.State.SUCCEEDED || workInfos[0].state == WorkInfo.State.FAILED) {
                    onComplete()
                }
            })
    }

    private fun callWorkerOnce(restoreFlag: Boolean, apiKey: String, onComplete: () -> Unit) {
        if(PbdExecutivesUtils.isInternetExists(applicationContext)) {
            if(restoreFlag) {
                restoreData(apiKey, 0, 100) {
                    syncOnce(onComplete)
                }
            } else {
                syncOnce(onComplete)
            }
        } else {
            onComplete()
        }
    }

    private fun gotoLogin() {
        PbdExecutivesUtils.stopSyncing(applicationContext)
        startActivity(Intent(this@MainActivity, LoginActivity::class.java))
        finishAffinity()       //remove the current activity from the activity stack so that back button makes it jump out of the application.
    }

    private fun gotoHome() {
        PbdExecutivesUtils.syncData(applicationContext)   //Start the background work that syncs the data to the server
        startActivity(Intent(this@MainActivity, HomeActivity::class.java))
        finishAffinity()       //remove the current activity from the activity stack so that back button makes it jump out of the application.
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        //This is to ignore the receipt file download exposure
        val builder = StrictMode.VmPolicy.Builder()
        StrictMode.setVmPolicy(builder.build())

        setContentView(R.layout.activity_main)

        val restoreData = intent.getBooleanExtra("restoreData", false)

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
            callWorkerOnce(restoreData, apiKey) {
                FirebaseInstanceId.getInstance().instanceId
                    .addOnCompleteListener(OnCompleteListener { task ->
                        if (!task.isSuccessful) {
                            Log.w("pbdLog", "FCM token fetch failed", task.exception)
                            Toast.makeText(this@MainActivity, "FCM token fetch failed ${task.exception?.message}", Toast.LENGTH_LONG).show()
                        }

                        val token = task.result?.token
                        Log.d("pbdLog", token)

                        this@MainActivity.lifecycleScope.launch {
                            val newApiKey: String? = db.userDetailsDao().getApiKey()
                            Log.i("pbdLog", "newApiKey: $newApiKey")

                            if(token != null) {
                                db.userDetailsDao().updateToken(token = token)
                            }

                            if(newApiKey == null) {
                                gotoLogin()
                            } else {
                                gotoHome()
                            }
                        }
                    })
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()

        Log.i("pbdLog", "Main Activity destroyed")
    }
}
