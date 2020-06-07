package com.example.pbdexecutives

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
    @Query("SELECT apiKey FROM UserDetails ORDER BY ID DESC LIMIT 1")
    suspend fun getApiKey(): String;

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
    val createdAt: Date
)

@Dao
interface LocationsDAO {
    @Query("SELECT group_concat(createdAt) AS createdAt FROM (SELECT * FROM Locations WHERE createdAt BETWEEN :start AND :end ORDER BY createdAt DESC) GROUP BY sessionId")
    suspend fun getTodaysTimestamps(start: Long, end: Long): List<String>

    @Insert
    suspend fun saveLocation(location: Locations)
}

@Database (entities = [UserDetails::class, Locations::class], version = 1)
@TypeConverters(Converters::class)
abstract class AppDB: RoomDatabase() {
    abstract fun userDetailsDao(): UserDetailsDAO
    abstract fun locationsDao(): LocationsDAO
}

class Converters {
    @TypeConverter
    fun fromTimestamp(value: Long?): Date? {
        return PbdExecutivesUtils().fromTimestamp(value);
    }

    @TypeConverter
    fun dateToTimestamp(date: Date?): Long? {
        return PbdExecutivesUtils().dateToTimestamp(date);
    }
}

