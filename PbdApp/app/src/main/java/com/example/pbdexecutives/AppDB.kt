package com.example.pbdexecutives

import androidx.lifecycle.LiveData
import androidx.room.*
import androidx.sqlite.db.SupportSQLiteQuery
import java.util.*

//UserDetails
@Entity
data class UserDetails (
    @PrimaryKey val id: Int,
    val apiKey: String?
)

@Dao
interface UserDetailsDAO {
    @Query("SELECT * FROM UserDetails ORDER BY ID DESC LIMIT 1")
    fun getCurrentUser(): LiveData<UserDetails>

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

