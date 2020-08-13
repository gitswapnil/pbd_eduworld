package com.example.pbdexecutives

import android.content.Context
import android.telecom.Call
import android.util.Base64
import android.util.Log
import androidx.concurrent.futures.CallbackToFutureAdapter
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.MutableLiveData
import androidx.room.PrimaryKey
import androidx.room.Room
import androidx.work.ListenableWorker
import androidx.work.WorkerParameters
import com.android.volley.DefaultRetryPolicy
import com.android.volley.Response
import com.google.common.util.concurrent.ListenableFuture
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.IOException
import java.lang.Exception
import java.util.*
import javax.security.auth.callback.Callback
import kotlin.collections.ArrayList
import kotlin.coroutines.suspendCoroutine

data class DeletedIdsObject(
    @SerializedName("id") val id: Long,
    @SerializedName("from") val from: String,
    @SerializedName("serverId") val serverId: String
)

data class LocationObject(
    @SerializedName("id") val id: Long,
    @SerializedName("latitude") val latitude: Double,
    @SerializedName("longitude") val longitude: Double,
    @SerializedName("sessionId") val sessionId: Int,
    @SerializedName("createdAt") val createdAt: Long
)

data class UserDetailsObject(
    @SerializedName("lastUpdatedAt") val lastUpdatedAt: Long,
    @SerializedName("fcmToken") val fcmToken: String
)

data class TasksObject(
    @SerializedName("id") val id: Long,
    @SerializedName("type") val type: Short?,
    @SerializedName("partyId") val partyId: String?,
    @SerializedName("cpName") val cpName: String?,
    @SerializedName("cpNumber") val cpNumber: String?,
    @SerializedName("reason") val reason: Short,
    @SerializedName("doneWithTask") val doneWithTask: Boolean,
    @SerializedName("reminder") val reminder: Boolean,
    @SerializedName("subject") val subject: String?,
    @SerializedName("remarks") val remarks: String?,
    @SerializedName("serverId") val serverId: String?,
    @SerializedName("createdAt") val createdAt: Long
)

data class FollowUpsObject(
    @SerializedName("id") val id: Long,
    @SerializedName("reminderDate") val reminderDate: Long?,
    @SerializedName("partyId") val partyId: String,
    @SerializedName("taskId") val taskId: Long,
    @SerializedName("followUpFor") val followUpFor: Short?,
    @SerializedName("serverId") val serverId: String?,
    @SerializedName("createdAt") val createdAt: Long
)

data class RequestObject(
    @SerializedName("apiKey") val apiKey: String,
    @SerializedName("deletedIds") val deletedIds: List<DeletedIdsObject>,
    @SerializedName("locations") val locations: List<LocationObject>,
    @SerializedName("userDetails") val userDetails: UserDetailsObject,
    @SerializedName("lastPartyDetails") val lastPartyDetails: Long,
    @SerializedName("tasks") val tasks: List<TasksObject>,
    @SerializedName("followUps") val followUps: List<FollowUpsObject>
)

data class UserDetailsResponseObject(
    @SerializedName("name") val name: String,
    @SerializedName("phoneNo") val phoneNo: String,
    @SerializedName("email") val email: String,
    @SerializedName("img") val img: String,
    @SerializedName("address") val address: String,
    @SerializedName("receiptSeries") val receiptSeries: String,
    @SerializedName("updatedAt") val updatedAt: Long
)

data class PartyDetailsResponseObject(
    @SerializedName("upsert") val upsert: List<Parties>,
    @SerializedName("remove") val remove: List<String>
)

data class TaskIdsResponseObject(
    @SerializedName("id") val id: Long,
    @SerializedName("serverId") val serverId: String
)

data class FollowUpIdsResponseObject(
    @SerializedName("id") val id: Long,
    @SerializedName("serverId") val serverId: String
)

data class MessageObject(
    @SerializedName("deletedIds") val deletedIds: List<Long>?,
    @SerializedName("locationIds") val locationIds: List<Long>?,
    @SerializedName("userDetails") val userDetails: UserDetailsResponseObject?,
    @SerializedName("partyDetails") val partyDetails: PartyDetailsResponseObject?,
    @SerializedName("taskIds") val taskIds: List<TaskIdsResponseObject>?,
    @SerializedName("followUpIds") val followUpIds: List<FollowUpIdsResponseObject>?
)

class ServerSyncWorker(appContext: Context, workerParams: WorkerParameters): ListenableWorker(appContext, workerParams){
    private fun syncFunc(completer: CallbackToFutureAdapter.Completer<ListenableWorker.Result>) {
        GlobalScope.launch {
            val db = Room.databaseBuilder(applicationContext, AppDB::class.java, "PbdDB").build()
            val apiKey: String? = db.userDetailsDao().getApiKey()
            if (apiKey != null) {            //if the user is not logged in then dont sync anything.

                //get unsynced DeletedIds
                val deletedIds: MutableList<DeletedIdsObject> = ArrayList()
                db.deletedIdsDao().getUnsyncedDeletedIds().forEach {
                    deletedIds.add(
                        DeletedIdsObject(
                            id = it.id,
                            from = it.from,
                            serverId = it.serverId
                        )
                    )
                }

                //get unsynced locations
                val locations: MutableList<LocationObject> = ArrayList()
                db.locationsDao().getUnsyncedLocations().forEach {
                    locations.add(
                        LocationObject(
                            id = it.id,
                            latitude = it.latitude,
                            longitude = it.longitude,
                            sessionId = it.sessionId,
                            createdAt = it.createdAt
                        )
                    )
                }

                //get User details last updatedAt
                val userObject = db.userDetailsDao().getCurrentUser()
                val userDetailsObject: UserDetailsObject = UserDetailsObject(lastUpdatedAt = userObject.updatedAt, fcmToken = userObject.fcmToken)

                //get parties last updatedAt
                val lastPartyDetails = db.partiesDao().getLastUpdatedParty()
                var lastPartyUpdatedAt:Long = 1

                if(lastPartyDetails != null) {      //if the user is initially loading the data then Parties table wont ne there hence check for the null rule
                    lastPartyUpdatedAt = lastPartyDetails.updatedAt
                }

                //get unsyned tasks
                var tasks: MutableList<TasksObject> = ArrayList()
                db.tasksDao().getUnsyncedTasks().forEach {
                    tasks.add(
                        TasksObject(
                            id = it.id,
                            type = it.type,
                            partyId = it.partyId,
                            cpName = it.contactPersonName,
                            cpNumber = it.contactPersonNumber,
                            reason = it.reasonForVisit,
                            doneWithTask = it.doneWithTask,
                            reminder = it.reminder,
                            subject = it.subject,
                            remarks = it.remarks,
                            serverId = it.serverId,
                            createdAt = it.createdAt
                        )
                    )
                }

                //get unsyned followUps
                var followUps: MutableList<FollowUpsObject> = ArrayList()
                db.followUpsDao().getUnsyncedFollowUps().forEach {
                    followUps.add(
                        FollowUpsObject(
                            id = it.id,
                            partyId = it.partyId,
                            taskId = it.taskId,
                            reminderDate = it.reminderDate,
                            followUpFor = it.followUpFor,
                            serverId = it.serverId,
                            createdAt = it.createdAt
                        )
                    )
                }

                val requestJSONObject: JSONObject = JSONObject(Gson().toJson(RequestObject(
                    apiKey = apiKey.toString(),
                    deletedIds = deletedIds,
                    locations = locations,
                    userDetails = userDetailsObject,
                    lastPartyDetails = lastPartyUpdatedAt,
                    tasks = tasks,
                    followUps = followUps
                )))

                PbdExecutivesUtils.sendData(
                    applicationContext,
                    "syncdata",
                    requestJSONObject,
                    { code, response ->
                        Log.i("pbdLog", "response: $response")
                        val responseObject = Gson().fromJson(
                            response.toString(),
                            MessageObject::class.java
                        );      //convert the response back into JSON Object from the response string
//                            Log.i("pbdLog", "responseObject: $responseObject")

                        GlobalScope.launch {
                            if(responseObject.deletedIds != null && responseObject.deletedIds.isNotEmpty()) {
                                var updateIds: MutableList<Long> = ArrayList()
                                responseObject.deletedIds.forEach {
                                    updateIds.add(it);
                                }

                                db.deletedIdsDao().markSynced(updateIds)     //update the locations as synced to database
                            }

                            //if the response object has location ids then only update them from the local database
                            if(responseObject.locationIds != null && responseObject.locationIds.isNotEmpty()) {
                                var updateIds: MutableList<Long> = ArrayList()
                                responseObject.locationIds.forEach {
                                    updateIds.add(it);
                                }

                                db.locationsDao().updateSyncStatus(updateIds)     //update the locations as synced to database
                            }

                            if(responseObject.userDetails != null) {
                                val userDetailsRef: UserDetailsResponseObject = responseObject.userDetails
                                db.userDetailsDao().saveUserDetails(
                                    name = userDetailsRef.name,
                                    phoneNo = userDetailsRef.phoneNo,
                                    email = userDetailsRef.email,
                                    img = if(userDetailsRef.img != null) Base64.decode(userDetailsRef.img, Base64.DEFAULT) else ByteArray(0x0),
                                    address = userDetailsRef.address,
                                    receiptSeries = userDetailsRef.receiptSeries,
                                    updatedAt = userDetailsRef.updatedAt
                                )
                            }

                            if(responseObject.partyDetails != null) {
                                val idsToRemove: MutableList<String> = ArrayList()
                                val partiesToUpsert: MutableList<Parties> = ArrayList()
                                if(responseObject.partyDetails.remove.isNotEmpty()) {
                                    idsToRemove.addAll(responseObject.partyDetails.remove)
                                }

                                if(responseObject.partyDetails.upsert.isNotEmpty()) {
                                    responseObject.partyDetails.upsert.forEach { party ->
                                        idsToRemove.add(party.id)
                                        partiesToUpsert.add(party)
                                    }
                                }

                                db.partiesDao().removeParties(idsToRemove)
                                db.partiesDao().addParties(partiesToUpsert)
                            }

                            if(responseObject.taskIds != null && responseObject.taskIds.isNotEmpty()) {
                                responseObject.taskIds.forEach {
                                    db.tasksDao().markTaskSynced(id = it.id, serverId = it.serverId)
                                }
                            }

                            if(responseObject.followUpIds != null && responseObject.followUpIds.isNotEmpty()) {
                                responseObject.followUpIds.forEach {
                                    db.followUpsDao().markFollowUpsSynced(id = it.id, serverId = it.serverId)
                                }
                            }

                            val dIds = db.deletedIdsDao().getUnsyncedDeletedIds()
                            val lIds = db.locationsDao().getUnsyncedLocations()
                            val tIds = db.tasksDao().getUnsyncedTasks()
                            val fIds = db.followUpsDao().getUnsyncedFollowUps()

                            if(dIds.isEmpty() && lIds.isEmpty() && tIds.isEmpty() && fIds.isEmpty()) {
                                Log.i("pbdLog", "Sync worker finished.")
                                completer.set(Result.success())
                            } else {
                                syncFunc(completer)
                            }

                            Log.i("pbdLog", "requestJSONObject: $requestJSONObject")
                        }
                    },
                    { code, error ->
                        Log.i("pbdLog", "Error...${error}")
                        if(code == 401) {       //401 means, the user's password is changed by the admin
                            PbdExecutivesUtils.logoutUser(applicationContext)
                        }
                        Log.i("pbdLog", "Sync worker finished.")
                        completer.setException(Throwable(error.toString()))
                    },
                    DefaultRetryPolicy(
                        DefaultRetryPolicy.DEFAULT_TIMEOUT_MS,
                        DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                        DefaultRetryPolicy.DEFAULT_BACKOFF_MULT
                    )
                )
            }
        }
    }

    override fun startWork(): ListenableFuture<Result> {
        Log.i("pbdLog", "Sync worker started.")
        return CallbackToFutureAdapter.getFuture { completer ->
            syncFunc(completer)
        }
    }

    override fun onStopped() {
        super.onStopped()

        Log.i("pbdLog", "Sync Worker is stopped.")
    }
}