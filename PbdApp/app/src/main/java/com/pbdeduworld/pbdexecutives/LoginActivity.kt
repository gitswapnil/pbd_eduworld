package com.pbdeduworld.pbdexecutives

import android.content.Intent
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.view.View
import android.widget.EditText
import android.widget.Toast
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.room.Room
import com.android.volley.DefaultRetryPolicy
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.*


class LoginActivity : AppCompatActivity(), LifecycleOwner {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)
    }

    fun login(view: View) {
        val phNo: String = findViewById<EditText>(R.id.editText).text.toString()
        val pwd: String = findViewById<EditText>(R.id.editText2).text.toString()

        val jsonRequestObject:JSONObject = JSONObject("{\"phNo\": \"${phNo}\", \"pwd\": \"${pwd}\"}")     //convert the string to JSON object

        PbdExecutivesUtils.sendData(
            this,
            "executivelogin",
            jsonRequestObject,
            { code: Int, response: Any ->
                this.lifecycleScope.launch {
                    val db = Room.databaseBuilder(this@LoginActivity, AppDB::class.java, "PbdDB").build()
                    db.userDetailsDao().clearUserDetails()     //clear the user details before inserting a new value
                    val userDetail = UserDetails(id = 1, apiKey = response.toString(), name = "", phoneNo = "", email = "", img = ByteArray(0x0), address = "", receiptSeries = "", fcmToken = "", updatedAt = 1)
                    db.userDetailsDao().createUser(userDetail)        //store the apiKey in local database.

                    val intent = Intent(this@LoginActivity, MainActivity::class.java)        //go to home activity after save
                    intent.putExtra("restoreData", true)
                    startActivity(intent)
                    finishAffinity()
                }
            },
            { code: Int, error: Any ->
                Toast.makeText(this, error.toString(), Toast.LENGTH_LONG).show()
            },
            DefaultRetryPolicy(5000, 0, 1f)
        )
    }
}
