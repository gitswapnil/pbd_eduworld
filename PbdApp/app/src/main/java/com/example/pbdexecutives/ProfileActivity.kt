package com.example.pbdexecutives

import android.app.Activity
import android.content.*
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Bundle
import android.util.Base64
import android.util.Base64.encodeToString
import android.util.Log
import android.view.MenuItem
import android.view.View
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import androidx.core.net.toUri
import androidx.lifecycle.lifecycleScope
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import androidx.room.Room
import com.android.volley.DefaultRetryPolicy
import com.google.android.material.snackbar.Snackbar
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.android.synthetic.main.activity_receipt_preview.*
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.*


class ProfileActivity : AppCompatActivity() {
    private lateinit var userLoginStateReceiver: BroadcastReceiver

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile)

        setSupportActionBar(findViewById(R.id.profile_toolbar))
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        displayUserDetails()
    }

    override fun onResume() {
        super.onResume()

        userLoginStatusMonitor()
    }

    override fun onPause() {
        super.onPause();

        userLoginStatusUnonitor()
    }

    private fun displayUserDetails() {
        val db = Room.databaseBuilder(this, AppDB::class.java, "PbdDB").build()
        GlobalScope.launch {
            val userDetails = db.userDetailsDao().getCurrentUser()

            findViewById<TextView>(R.id.textView6).text = userDetails.name
            findViewById<TextView>(R.id.textView8).text = userDetails.email
            findViewById<TextView>(R.id.textView10).text = userDetails.phoneNo
            findViewById<TextView>(R.id.textView15).text = userDetails.address

            Log.i("pbdLog", "userDetails.img: ${userDetails.img}")
            val bitmap = BitmapFactory.decodeByteArray(userDetails.img, 0, userDetails.img.size)
            findViewById<ImageView>(R.id.imageView5).setImageBitmap(bitmap)
        }
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (item.itemId == android.R.id.home) {
            finish();
            return true;
        }

        return super.onOptionsItemSelected(item);
    }

    private fun userLoginStatusMonitor() {
        val filter = IntentFilter(PbdExecutivesUtils.actionUserLoggedOut)
        val newIntent = Intent(this, MainActivity::class.java)        //go to home activity after save

        userLoginStateReceiver = object : BroadcastReceiver() {         //receiver always called only when the duty switch is OFF.
            override fun onReceive(context: Context, intent: Intent) {
                startActivity(newIntent)
                finishAffinity()
            }
        }

        LocalBroadcastManager.getInstance(this).registerReceiver(userLoginStateReceiver, filter)
    }

    private fun userLoginStatusUnonitor() {
        LocalBroadcastManager.getInstance(this).unregisterReceiver(userLoginStateReceiver)
    }

    fun logout(view: View) {
        val alertDialog: AlertDialog? = this.let {
            val builder = AlertDialog.Builder(it)
            builder.apply {
                setPositiveButton(R.string.yes,
                    DialogInterface.OnClickListener { dialog, id ->
                        // User clicked OK button
                        PbdExecutivesUtils.logoutUser(applicationContext)
                    })
                setNegativeButton(R.string.no,
                    DialogInterface.OnClickListener { dialog, id ->
                        // User cancelled the dialog
                    })
            }
            // Set other dialog properties
            builder.setTitle(R.string.warning).setMessage(R.string.confirm_logout_user)

            // Create the AlertDialog
            builder.create()
        }

        alertDialog?.show()
    }
}