package com.example.pbdexecutives

import androidx.room.*

@Entity
data class UserDetails (
    @PrimaryKey val id: Int,
    val apiKey: String?
)

@Dao
interface UserDetailsDAO {
    @Query("SELECT apiKey FROM UserDetails ORDER BY ID DESC LIMIT 1")
    fun getApiKey(): Array<String>;

    @Query("DELETE FROM UserDetails")
    fun clearUserDetails()

    @Insert
    fun saveUserDetails(user: UserDetails)
}