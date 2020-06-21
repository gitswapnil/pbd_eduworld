package com.example.pbdexecutives

import androidx.lifecycle.LiveData
import androidx.room.*
import androidx.sqlite.db.SupportSQLiteQuery
import java.nio.ByteBuffer
import java.util.*

//UserDetails
@Entity
data class UserDetails (
    @PrimaryKey val id: Int,
    val apiKey: String?,
    val name: String,
    val phoneNo: String,
    val email: String,
    @ColumnInfo(typeAffinity = ColumnInfo.BLOB) val img: ByteArray,
    val createdAt: Long,
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
    suspend fun saveUserDetails(user: UserDetails)
}

//Locations
@Entity
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

    @Query("SELECT * FROM locations WHERE synced=0")
    suspend fun getUnsyncedLocations(): Array<Locations>

    @Query("UPDATE locations SET synced=1 WHERE id IN (:ids)")
    suspend fun updateSyncStatus(ids: List<Long>)
}

@Database (entities = [UserDetails::class, Locations::class], version = 1)
abstract class AppDB: RoomDatabase() {
    abstract fun userDetailsDao(): UserDetailsDAO
    abstract fun locationsDao(): LocationsDAO
}

