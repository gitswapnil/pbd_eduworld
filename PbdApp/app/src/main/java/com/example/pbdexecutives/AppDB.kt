package com.example.pbdexecutives

import androidx.lifecycle.LiveData
import androidx.room.*
import androidx.sqlite.db.SupportSQLiteQuery
import com.google.gson.annotations.SerializedName
import java.math.BigDecimal
import java.nio.ByteBuffer
import java.util.*
import kotlin.collections.ArrayList

//DeletedIds
@Entity(indices = [Index(value = ["id"], unique = true)])
data class DeletedIds (
    @PrimaryKey (autoGenerate = true) val id: Long = 0,
    val from: String,
    val serverId: String,
    val synced: Boolean,
    val createdAt: Long
)

@Dao
interface DeletedIdsDAO {
    @Query("SELECT * FROM DeletedIds WHERE synced=0 LIMIT 100")
    suspend fun getUnsyncedDeletedIds(): List<DeletedIds>

    @Query("UPDATE DeletedIds SET synced=1 WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<Long>)

    @Insert
    suspend fun recordDeleteId(data: DeletedIds)
}

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
    val receiptSeries: String,
    val fcmToken: String,
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
        if (address != other.address) return false
        if (receiptSeries != other.receiptSeries) return false
        if (fcmToken != other.fcmToken) return false
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
        result = 31 * result + address.hashCode()
        result = 31 * result + receiptSeries.hashCode()
        result = 31 * result + fcmToken.hashCode()
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

    @Query("UPDATE UserDetails SET fcmToken=:token WHERE id=1")
    suspend fun updateToken(token: String)

    @Query("DELETE FROM UserDetails")
    suspend fun clearUserDetails()

    @Insert
    suspend fun createUser(user: UserDetails)

    @Query("UPDATE UserDetails SET name=:name, phoneNo=:phoneNo, email=:email, img=:img, address=:address, receiptSeries=:receiptSeries, updatedAt=:updatedAt")
    suspend fun saveUserDetails(name: String, phoneNo: String, email: String, img: ByteArray, address: String, receiptSeries: String, updatedAt: Long)
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

    @Query("SELECT * FROM Locations WHERE synced=0 LIMIT 100")
    suspend fun getUnsyncedLocations(): Array<Locations>

    @Query("UPDATE Locations SET synced=1 WHERE id IN (:ids)")
    suspend fun updateSyncStatus(ids: List<Long>)

    @Query("DELETE FROM Locations")
    suspend fun clearLocations()
}

//Parties
@Entity(indices = [Index(value = ["id"], unique = true)])
data class Parties (
    @SerializedName("id") @PrimaryKey val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("cNumber") val cNumber: String,
    @SerializedName("address") val address: String,
    @SerializedName("updatedAt") val updatedAt: Long
)

@Dao
interface PartiesDAO {
    @Query("SELECT * FROM Parties")
    suspend fun getAllParties(): List<Parties>

    @Query("SELECT * FROM Parties ORDER BY updatedAt DESC LIMIT 1")
    suspend fun getLastUpdatedParty(): Parties

    @Query("SELECT * FROM Parties WHERE id=:id")
    suspend fun getPartyDetails(id: String): Parties

    @Insert
    suspend fun addParties(parties: List<Parties>)

    @Query("DELETE FROM Parties WHERE id IN (:ids)")
    suspend fun removeParties(ids: List<String>)

    @Query("DELETE FROM Parties")
    suspend fun clearParties()
}

//Tasks
@Entity(indices = [Index(value = ["id"], unique = true)])
data class Tasks (
    @PrimaryKey (autoGenerate = true) val id: Long = 0,
    val type: Short,
    val partyId: String?,
    val contactPersonName: String?,
    val contactPersonNumber: String?,
    val reasonForVisit: Short,
    val doneWithTask: Boolean,
    val reminder: Boolean,
    val remarks: String,
    val subject: String,
    val serverId: String?,
    val synced: Boolean,
    val createdAt: Long
)

data class TasksWithJoins (
    @PrimaryKey (autoGenerate = true) val id: Long = 0,
    val type: Short,
    val partyId: String?,
    val partyName: String?,
    val partyAddress: String?,
    val contactPersonName: String?,
    val contactPersonNumber: String?,
    val reasonForVisit: Short,
    val doneWithTask: Boolean,
    val reminder: Boolean,
    val reminderDate: Long?,
    val remarks: String,
    val serverId: String?,
    val subject: String,
    val createdAt: Long
)

@Dao
interface TasksDAO {
    @Query("SELECT * FROM Tasks WHERE synced=0 LIMIT 100")
    suspend fun getUnsyncedTasks(): List<Tasks>

    @Query("SELECT t.id, t.type, t.partyId, p.name AS partyName, p.address as partyAddress, t.contactPersonName, t.contactPersonNumber, t.reasonForVisit, t.doneWithTask, t.reminder, f.reminderDate, t.remarks, t.subject, t.serverId, t.createdAt FROM Tasks AS t LEFT JOIN Parties AS p ON t.partyId=p.id LEFT JOIN FollowUps AS f ON t.id=f.taskId WHERE t.id=:taskId")
    suspend fun getTaskDetails(taskId: Long): TasksWithJoins

    @Query("SELECT id, type, partyId, partyName, partyAddress, contactPersonName, contactPersonNumber, reasonForVisit, doneWithTask, reminder, reminderDate, remarks, subject, serverId, createdAt FROM (SELECT t.id, t.type, t.partyId, p.name AS partyName, p.address as partyAddress, t.contactPersonName, t.contactPersonNumber, CASE t.reasonForVisit WHEN 0 THEN 'Sampling' WHEN 1 THEN 'To receive order' WHEN 2 THEN 'To get payment' ELSE '' END AS reasonForVisitFormatted, t.reasonForVisit, t.doneWithTask, t.reminder, f.reminderDate, t.remarks, t.subject, t.serverId, (strftime('%d/%m/', datetime(t.createdAt/1000, 'unixepoch')) || substr(strftime('%Y', datetime(t.createdAt/1000, 'unixepoch')), 3)) AS formattedCreatedAt, t.createdAt FROM Tasks AS t LEFT JOIN Parties AS p ON t.partyId=p.id LEFT JOIN FollowUps AS f ON t.id=f.taskId WHERE partyName LIKE :searchQuery OR partyAddress LIKE :searchQuery OR subject LIKE :searchQuery OR contactPersonName LIKE :searchQuery OR contactPersonNumber LIKE :searchQuery OR remarks LIKE :searchQuery OR formattedCreatedAt LIKE :searchQuery OR (CASE type WHEN 0 THEN reasonForVisitFormatted LIKE :searchQuery ELSE 0 END) ORDER BY t.createdAt DESC LIMIT :limit OFFSET :offset) ORDER BY createdAt DESC;")
    suspend fun getTasks(limit: Int, offset: Int, searchQuery: String): List<TasksWithJoins>

    @Query("UPDATE Tasks SET serverId=:serverId, synced=1 WHERE id=:id")
    suspend fun markTaskSynced(id: Long, serverId: String)

    @Insert
    suspend fun addTask(tasks: Tasks): Long

    @Query("DELETE FROM Tasks WHERE id=:taskId")
    suspend fun deleteTask(taskId: Long)

    @Query("UPDATE Tasks SET type=:type, partyId=:partyId, contactPersonName=:contactPersonName, contactPersonNumber=:contactPersonNumber, reasonForVisit=:reasonForVisit, doneWithTask=:doneWithTask, reminder=:reminder, remarks=:remarks, subject=:subject, synced=0 WHERE id=:id")
    suspend fun updateTask(id:Long, type: Short, partyId: String?, contactPersonName: String?, contactPersonNumber: String?, reasonForVisit: Short, doneWithTask: Boolean, reminder: Boolean, remarks: String, subject: String)

    @Query("SELECT * FROM Tasks WHERE serverId=:serverId")
    suspend fun getTaskFromServerId(serverId: String): Tasks

    @Query("DELETE FROM Tasks")
    suspend fun clearTasks()
}

//FollowUps
@Entity(indices = [Index(value = ["id"], unique = true)])
data class FollowUps(
    @PrimaryKey (autoGenerate = true) val id: Long = 0,
    val reminderDate: Long?,
    val partyId: String,
    val taskId: Long,
    val followUpFor: Short?,
    val serverId: String?,
    val synced: Boolean,
    val createdAt: Long
)

data class FollowUpsWithJoins(
    @PrimaryKey (autoGenerate = true) val id: Long = 0,
    val reminderDate: Long?,
    val partyId: String,
    val partyName: String,
    val partyAddress: String,
    val taskId: Long,
    val cpName: String,
    val cpNumber: Long?,
    val followUpFor: Short?,
    val createdAt: Long
)

@Dao
interface FollowUpsDAO {
    @Query("SELECT * FROM FollowUps WHERE synced=0 LIMIT 100")
    suspend fun getUnsyncedFollowUps(): List<FollowUps>

    @Query("SELECT id, reminderDate, followUpFor, partyId, taskId, partyName, partyAddress, cpName, cpNumber, createdAt FROM (SELECT f.id, f.reminderDate, ifnull((strftime('%d/%m/', datetime(f.reminderDate/1000, 'unixepoch')) || substr(strftime('%Y', datetime(f.reminderDate/1000, 'unixepoch')), 3)), 'Reminder not set') AS formattedReminderDate, f.followUpFor, (CASE f.followUpFor WHEN 0 THEN 'Sampling' WHEN 1 THEN 'To receive order' WHEN 2 THEN 'To get payment' END) AS formattedFollowUpFor, p.id as partyId, t.id as taskId, p.name as partyName, p.address as partyAddress, t.contactPersonName as cpName, t.contactPersonNumber as cpNumber, f.createdAt as createdAt FROM (SELECT * FROM (SELECT * FROM FollowUps ORDER BY createdAt ASC) GROUP BY partyId) AS f LEFT JOIN Tasks AS t ON f.taskId=t.id LEFT JOIN Parties AS p ON f.partyId=p.id WHERE f.followUpFor IN (0,1,2) AND (formattedReminderDate LIKE :searchQuery OR formattedFollowUpFor LIKE :searchQuery OR partyName LIKE :searchQuery OR partyAddress LIKE :searchQuery OR cpName LIKE :searchQuery OR cpNumber LIKE :searchQuery )) ORDER BY createdAt DESC LIMIT :limit OFFSET :offset")
    suspend fun getFollowUps(limit: Int, offset: Int, searchQuery: String): List<FollowUpsWithJoins>

    @Query("UPDATE FollowUps SET synced=1, serverId=:serverId WHERE id=:id")
    suspend fun markFollowUpsSynced(id: Long, serverId: String)

    @Insert
    suspend fun addFollowUp(followUps: FollowUps)

    @Query("SELECT f.id, f.reminderDate, f.followUpFor, p.id as partyId, t.id as taskId, p.name as partyName, p.address as partyAddress, t.contactPersonName as cpName, t.contactPersonNumber as cpNumber, f.createdAt as createdAt FROM (SELECT * FROM (SELECT * FROM FollowUps ORDER BY createdAt ASC) GROUP BY partyId) AS f LEFT JOIN Tasks AS t ON f.taskId=t.id LEFT JOIN Parties AS p ON f.partyId=p.id WHERE f.id=:id")
    suspend fun getFollowUp(id: Long): FollowUpsWithJoins?

    @Query("SELECT f.id, f.reminderDate, f.followUpFor, p.id as partyId, t.id as taskId, p.name as partyName, p.address as partyAddress, t.contactPersonName as cpName, t.contactPersonNumber as cpNumber, f.createdAt as createdAt FROM FollowUps AS f LEFT JOIN (SELECT CASE WHEN COUNT(1) > 0 THEN createdAt ELSE NULL END as constCreatedAt FROM FollowUps WHERE followUpFor IS NULL AND partyId=:partyId ORDER BY constCreatedAt DESC LIMIT 1) LEFT JOIN Tasks AS t ON f.taskId=t.id LEFT JOIN Parties AS p ON f.partyId=p.id WHERE f.partyId=:partyId AND f.createdAt>0 ORDER BY f.createdAt DESC")
    suspend fun getFollowUpHistory(partyId: String): List<FollowUpsWithJoins>

    @Query("SELECT * FROM FollowUps WHERE taskId=:taskId")
    suspend fun getTaskAttachedFollowUp(taskId: Long): FollowUps?

    @Query("SELECT f.id AS id, f.unixReminderDate AS reminderDate, f.partyId AS partyId, p.name AS partyName, p.address AS partyAddress, f.taskId AS taskId, t.contactPersonName AS cpName, t.contactPersonNumber AS cpNumber, f.followUpFor AS followUpFor, f.createdAt AS createdAt FROM (SELECT *, ((unixReminderDate - todayStart) > 0 & (todayEnd - unixReminderDate) > 0) AS difference FROM (SELECT *, (reminderDate/1000) AS unixReminderDate, strftime('%s', datetime('now', 'localtime', 'start of day')) AS todayStart, strftime('%s', datetime('now', 'localtime', 'start of day', '+1 day', '-1 second')) AS todayEnd FROM followUps) WHERE difference=1) AS f LEFT JOIN parties AS p ON p.id=f.partyId LEFT JOIN tasks AS t ON t.id=f.taskId WHERE followUpFor IS NOT NULL;")
    suspend fun getTodaysFollowUps(): List<FollowUpsWithJoins>

    @Query("UPDATE FollowUps SET synced=0, reminderDate=:reminderDate, partyId=:partyId, followUpFor=:followUpFor WHERE id=:id")
    suspend fun updateFollowUp(id: Long, reminderDate: Long?, partyId: String, followUpFor: Short?)

    @Query("DELETE FROM FollowUps WHERE taskId=:taskId")
    suspend fun deleteFollowUp(taskId: Long)

    @Query("DELETE FROM FollowUps")
    suspend fun clearFollowUps()
}

data class cpDetails(
    @SerializedName("cpName") val cpName: String,
    @SerializedName("cpNumber") val cpNumber: String,
    @SerializedName("cpEmail") val cpEmail: String?,
    @SerializedName("cpCreatedAt") val cpCreatedAt: Long
)

//Receipts
@Entity(indices = [Index(value = ["id"], unique = true)])
data class Receipts(
    @PrimaryKey (autoGenerate = true) val id: Long = 0,
    @SerializedName("receiptNo") val receiptNo: Long,
    @SerializedName("partyId") val partyId: String,
    @SerializedName("cpName") val cpName: String,
    @SerializedName("cpNumber") val cpNumber: String,
    @SerializedName("cpEmail") val cpEmail: String?,
    @SerializedName("amount") val amount: String,
    @SerializedName("paidBy") val paidBy: Byte,
    @SerializedName("chequeNo") val chequeNo: String?,
    @SerializedName("ddNo") val ddNo: String?,
    @SerializedName("payment") val payment: Byte,
    @SerializedName("serverId") val serverId: String?,
    @SerializedName("createdAt") val createdAt: Long
)

data class ReceiptsWithJoins(
    @PrimaryKey (autoGenerate = true) val id: Long = 0,
    @SerializedName("receiptNo") val receiptNo: Long,
    @SerializedName("partyId") val partyId: String,
    @SerializedName("partyCode") val partyCode: String,
    @SerializedName("partyName") val partyName: String,
    @SerializedName("partyAddress") val partyAddress: String,
    @SerializedName("partyPhNumber") val partyPhNumber: String,
    @SerializedName("cpName") val cpName: String,
    @SerializedName("cpNumber") val cpNumber: String,
    @SerializedName("cpEmail") val cpEmail: String?,
    @SerializedName("amount") val amount: String,
    @SerializedName("paidBy") val paidBy: Byte,
    @SerializedName("chequeNo") val chequeNo: String?,
    @SerializedName("ddNo") val ddNo: String?,
    @SerializedName("payment") val payment: Byte,
    @SerializedName("serverId") val serverId: String?,
    @SerializedName("createdAt") val createdAt: Long,
    @SerializedName("concatCreatedAt") val concatCreatedAt: String?
)

@Dao
interface ReceiptsDAO{
    @Insert
    suspend fun addReceipt(receipts: Receipts)

    @Query("SELECT id, receiptNo, partyId, partyCode, partyName, partyAddress, partyPhNumber, cpName, cpNumber, cpEmail, amount, paidBy, chequeNo, ddNo, payment, createdAt, serverId FROM (SELECT r.id, r.receiptNo, ('#' || ud.receiptSeries || r.receiptNo) AS formattedReceiptNo, r.partyId, p.code as partyCode, p.name as partyName, p.address as partyAddress, p.cNumber as partyPhNumber, r.cpName, r.cpNumber, r.cpEmail, r.amount, r.paidBy, r.chequeNo, r.ddNo, r.payment, (strftime('%d/%m/', datetime(r.createdAt/1000, 'unixepoch')) || substr(strftime('%Y', datetime(r.createdAt/1000, 'unixepoch')), 3)) AS formattedCreatedAt, r.createdAt, r.serverId FROM Receipts AS r LEFT JOIN Parties AS p ON r.partyId=p.id LEFT JOIN UserDetails AS ud ON ud.id=1 WHERE formattedReceiptNo LIKE :searchQuery OR partyName LIKE :searchQuery OR partyAddress LIKE :searchQuery OR cpName LIKE :searchQuery OR cpNumber LIKE :searchQuery OR amount LIKE :searchQuery OR chequeNo LIKE :searchQuery OR ddNo LIKE :searchQuery OR formattedCreatedAt LIKE :searchQuery GROUP BY r.serverId) ORDER BY createdAt DESC LIMIT :limit OFFSET :offset")
    suspend fun getReceipts(limit: Int, offset: Int, searchQuery: String): List<ReceiptsWithJoins>

    @Query("SELECT rr.id, rr.receiptNo, rr.partyId, rr.partyCode, rr.partyName, rr.partyAddress, rr.partyPhNumber, group_concat(cpName) as cpName, group_concat(cpNumber) as cpNumber, group_concat(cpEmail) as cpEmail, rr.amount, rr.paidBy, rr.chequeNo, rr.ddNo, rr.payment, rr.serverId, rr.createdAt, group_concat(createdAt) as concatCreatedAt FROM (SELECT r.*, p.code as partyCode, p.name as partyName, p.address as partyAddress, p.cNumber as partyPhNumber FROM Receipts AS r LEFT JOIN Parties AS p ON r.partyId=p.id ORDER BY r.createdAt DESC) AS rr LEFT JOIN (SELECT rt.serverId FROM Receipts AS rt WHERE rt.id=:id) AS rs ON rr.serverId=rs.serverId WHERE rr.serverId=rs.serverId GROUP BY rr.serverId")
    suspend fun getReceiptDetails(id: Long): ReceiptsWithJoins

    @Query("DELETE FROM Receipts")
    suspend fun clearReceipts()
}

//Notifications
@Entity(indices = [Index(value = ["id"], unique = true)])
data class Notifications(
    @SerializedName("id") @PrimaryKey val id: String,
    @SerializedName("text") val text: String,
    @SerializedName("type") val type: String,
    @SerializedName("img") val img: ByteArray?,
    @SerializedName("seen") val seen: Boolean,
    @SerializedName("createdAt") val createdAt: Long
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as Notifications

        if (id != other.id) return false
        if (text != other.text) return false
        if (type != other.type) return false
        if (img != null) {
            if (other.img == null) return false
            if (!img.contentEquals(other.img)) return false
        } else if (other.img != null) return false
        if (seen != other.seen) return false
        if (createdAt != other.createdAt) return false

        return true
    }

    override fun hashCode(): Int {
        var result = id.hashCode()
        result = 31 * result + text.hashCode()
        result = 31 * result + type.hashCode()
        result = 31 * result + (img?.contentHashCode() ?: 0)
        result = 31 * result + seen.hashCode()
        result = 31 * result + createdAt.hashCode()
        return result
    }
}

@Dao
interface NotificationsDAO{
    @Insert
    suspend fun addNotifications(notifications: List<Notifications>)

    @Query("SELECT * FROM Notifications ORDER BY createdAt DESC LIMIT :limit OFFSET :offset")
    suspend fun getNotifications(limit: Int, offset: Int): List<Notifications>

    @Query("SELECT * FROM Notifications WHERE id=:notificationId")
    suspend fun getNotification(notificationId: String): Notifications

    @Query("SELECT * FROM Notifications WHERE seen=0")
    suspend fun getUnseenNotifications(): List<Notifications>

    @Query("UPDATE Notifications SET seen=1")
    suspend fun markAllSeen()

    @Query("SELECT * FROM Notifications ORDER BY createdAt DESC LIMIT 1")
    suspend fun getLastUpdatedAt(): Notifications

    @Query("DELETE FROM Notifications")
    suspend fun clearNotifications()
}

@Database (entities = [ DeletedIds::class,
                        UserDetails::class,
                        Locations::class,
                        Parties::class,
                        Tasks::class,
                        FollowUps::class,
                        Receipts::class,
                        Notifications::class], version = 1)
abstract class AppDB: RoomDatabase() {
    abstract fun deletedIdsDao(): DeletedIdsDAO
    abstract fun userDetailsDao(): UserDetailsDAO
    abstract fun locationsDao(): LocationsDAO
    abstract fun partiesDao(): PartiesDAO
    abstract fun tasksDao(): TasksDAO
    abstract fun followUpsDao(): FollowUpsDAO
    abstract fun receiptsDao(): ReceiptsDAO
    abstract fun notificationsDao(): NotificationsDAO
}

