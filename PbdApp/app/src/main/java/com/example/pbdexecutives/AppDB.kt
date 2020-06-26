package com.example.pbdexecutives

import androidx.lifecycle.LiveData
import androidx.room.*
import androidx.sqlite.db.SupportSQLiteQuery
import com.google.gson.annotations.SerializedName
import java.nio.ByteBuffer
import java.util.*
import kotlin.collections.ArrayList

//UserDetails
@Entity(indices = [Index(value = ["id"], unique = true)])
data class UserDetails (
    @PrimaryKey val id: Int,
    val apiKey: String?,
    val name: String,
    val phoneNo: String,
    val email: String,
    @ColumnInfo(typeAffinity = ColumnInfo.BLOB) val img: ByteArray,
    val address: String,
    val updatedAt: Long
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as UserDetails

        if (id != other.id) return false
        if (apiKey != other.apiKey) return false
        if (name != other.name) return false
        if (phoneNo != other.phoneNo) return false
        if (email != other.email) return false
        if (!img.contentEquals(other.img)) return false
        if (updatedAt != other.updatedAt) return false

        return true
    }

    override fun hashCode(): Int {
        var result = id
        result = 31 * result + (apiKey?.hashCode() ?: 0)
        result = 31 * result + name.hashCode()
        result = 31 * result + phoneNo.hashCode()
        result = 31 * result + email.hashCode()
        result = 31 * result + img.contentHashCode()
        result = 31 * result + updatedAt.hashCode()
        return result
    }
}

@Dao
interface UserDetailsDAO {
    @Query("SELECT * FROM UserDetails ORDER BY ID DESC LIMIT 1")
    fun getCurrentUser(): UserDetails

    @Query("SELECT apiKey FROM UserDetails ORDER BY ID DESC LIMIT 1")
    suspend fun getApiKey(): String

    @Query("DELETE FROM UserDetails")
    suspend fun clearUserDetails()

    @Insert
    suspend fun createUser(user: UserDetails)

    @Query("UPDATE UserDetails SET name=:name, phoneNo=:phoneNo, email=:email, img=:img, address=:address, updatedAt=:updatedAt")
    suspend fun saveUserDetails(name: String, phoneNo: String, email: String, img: ByteArray, address: String, updatedAt: Long)
}

//Locations
@Entity(indices = [Index(value = ["id"], unique = true)])
data class Locations (
    @PrimaryKey (autoGenerate = true) val id: Long = 0,
    val latitude: Double,
    val longitude: Double,
    val sessionId: Int,
    val createdAt: Long,
    val synced: Boolean
)

@Dao
interface LocationsDAO {
    @Query("SELECT group_concat(createdAt) AS createdAt FROM (SELECT * FROM Locations WHERE createdAt BETWEEN :start AND :end ORDER BY createdAt DESC) GROUP BY sessionId")
    suspend fun getTodaysTimestamps(start: Long, end: Long): List<String>

    @Insert
    suspend fun saveLocation(location: Locations)

    @Query("SELECT * FROM Locations WHERE synced=0")
    suspend fun getUnsyncedLocations(): Array<Locations>

    @Query("UPDATE Locations SET synced=1 WHERE id IN (:ids)")
    suspend fun updateSyncStatus(ids: List<Long>)
}

//Parties
@Entity(indices = [Index(value = ["id"], unique = true)])
data class Parties (
    @SerializedName("id") @PrimaryKey val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("address") val address: String,
    @SerializedName("updatedAt") val updatedAt: Long
)

@Dao
interface PartiesDAO {
    @Query("SELECT * FROM Parties")
    suspend fun getAllParties(): List<Parties>

    @Query("SELECT * FROM Parties ORDER BY updatedAt DESC LIMIT 1")
    suspend fun getLastUpdatedParty(): Parties

    @Insert
    suspend fun addParties(parties: List<Parties>)

    @Query("DELETE FROM Parties WHERE id IN (:ids)")
    suspend fun removeParties(ids: List<String>)
}

//Tasks
@Entity(indices = [Index(value = ["id"], unique = true)])
data class Tasks (
    @PrimaryKey (autoGenerate = true) val id: Long = 0,
    val type: Short?,
    val organizationId: String?,
    val contactPersonName: String?,
    val contactPersonNumber: Long?,
    val reasonForVisit: Short,
    val doneWithTask: Boolean,
    val reminder: Boolean,
    val reminderDate: Long?,
    val remarks: String?,
    val subject: String?,
    val serverId: String?,
    val synced: Boolean,
    val createdAt: Long
)

data class TasksWithOrganizationJoin (
    @PrimaryKey (autoGenerate = true) val id: Long = 0,
    val type: Short?,
    val organizationId: String?,
    val organization: String,
    val contactPersonName: String?,
    val contactPersonNumber: Long?,
    val reasonForVisit: Short,
    val doneWithTask: Boolean,
    val reminder: Boolean,
    val reminderDate: Long?,
    val remarks: String?,
    val subject: String?,
    val createdAt: Long
)

@Dao
interface TasksDAO {
    @Query("SELECT * FROM Tasks WHERE synced=0")
    suspend fun getUnsyncedTasks(): List<Tasks>

    @Query("SELECT t.id, t.type, t.organizationId, p.name AS organization, t.contactPersonName, t.contactPersonNumber, t.reasonForVisit, t.doneWithTask, t.reminder, t.reminderDate, t.remarks, t.subject, t.serverId, t.createdAt FROM Tasks AS t INNER JOIN Parties AS p WHERE t.organizationId=p.id ORDER BY createdAt DESC LIMIT :limit OFFSET :offset")
    suspend fun getTasks(limit: Int, offset: Int): List<TasksWithOrganizationJoin>

    @Query("UPDATE Tasks SET serverId=:serverId, synced=1 WHERE id=:id")
    suspend fun markTaskSynced(id: Long, serverId: String)

    @Insert
    suspend fun addTasks(tasks: List<Tasks>)
}

@Database (entities = [UserDetails::class, Locations::class, Parties::class, Tasks::class], version = 1)
abstract class AppDB: RoomDatabase() {
    abstract fun userDetailsDao(): UserDetailsDAO
    abstract fun locationsDao(): LocationsDAO
    abstract fun partiesDao(): PartiesDAO
    abstract fun tasksDao(): TasksDAO
}

