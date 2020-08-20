package com.example.pbdexecutives

import android.content.Context
import android.content.res.Resources
import android.graphics.BitmapFactory
import android.view.ContextThemeWrapper
import androidx.recyclerview.widget.RecyclerView
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.content.ContextCompat

import com.example.pbdexecutives.dummy.DummyContent.DummyItem
import kotlin.reflect.KFunction1

data class NotificationsListItemModel(
    var id: String,
    var type: String,
    var text: String,
    var image: ByteArray?,
    val createdAt: String,
    val onClick: KFunction1<@ParameterName(name = "notificationId") String, NotificationsFragment.OnItemClick>
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as NotificationsListItemModel

        if (id != other.id) return false
        if (type != other.type) return false
        if (text != other.text) return false
        if (image != null) {
            if (other.image == null) return false
            if (!image!!.contentEquals(other.image!!)) return false
        } else if (other.image != null) return false
        if (createdAt != other.createdAt) return false
        if (onClick != other.onClick) return false

        return true
    }

    override fun hashCode(): Int {
        var result = id.hashCode()
        result = 31 * result + type.hashCode()
        result = 31 * result + text.hashCode()
        result = 31 * result + (image?.contentHashCode() ?: 0)
        result = 31 * result + createdAt.hashCode()
        result = 31 * result + onClick.hashCode()
        return result
    }
}

class NotificationsRecyclerViewAdapter(
    private val values: List<NotificationsListItemModel?>
) : RecyclerView.Adapter<NotificationsRecyclerViewAdapter.ViewHolder>() {
    private lateinit var parentContext: Context
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.fragment_notifications, parent, false)
        parentContext = parent.context
        return ViewHolder(view)
    }

    private fun changeDataPlaceholdersVisibility(holder: NotificationsRecyclerViewAdapter.ViewHolder, visibility: Int) {
        holder.notificationText.visibility = visibility
        holder.notificationType.visibility = visibility
        holder.notificationImg.visibility = visibility
        holder.notificationTypeIcon.visibility = visibility

        if(visibility == View.VISIBLE) {
            holder.loaderCircle.visibility = View.GONE
        } else if(visibility == View.GONE){
            holder.loaderCircle.visibility = View.VISIBLE
        }
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = values[position]
        if(item != null) {
            holder.notificationText.text = item.text
            if(item.type == "info") {
                holder.notificationType.text = parentContext.getString(R.string.info)
                holder.notificationType.setTextColor(ContextCompat.getColor(parentContext, R.color.information))
                holder.notificationTypeIcon.setImageDrawable(ContextCompat.getDrawable(parentContext, R.drawable.ic_baseline_info_12))
            } else {
                holder.notificationType.text = parentContext.getString(R.string.warning)
                holder.notificationType.setTextColor(ContextCompat.getColor(parentContext, R.color.warning))
                holder.notificationTypeIcon.setImageDrawable(ContextCompat.getDrawable(parentContext, R.drawable.ic_outline_warning_12))
            }
            holder.notificationItem.setOnClickListener(item.onClick(item.id))

            if(item.image !== null) {
                val bitmap = BitmapFactory.decodeByteArray(item.image, 0, item.image!!.size)
                holder.notificationImg.setImageBitmap(bitmap)
            }

            changeDataPlaceholdersVisibility(holder, View.VISIBLE)
        } else {
            changeDataPlaceholdersVisibility(holder, View.GONE)
        }
    }

    override fun getItemCount(): Int = values.size

    inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val notificationItem: ConstraintLayout = view.findViewById(R.id.notifications_list_layout)
        val notificationText: TextView = view.findViewById(R.id.notification_text)
        val notificationType: TextView = view.findViewById(R.id.notification_type)
        val notificationImg: ImageView = view.findViewById(R.id.notification_img)
        val notificationTypeIcon: ImageView = view.findViewById(R.id.notification_type_icon)
        val loaderCircle: ProgressBar = view.findViewById(R.id.notifications_loader_circle)
    }
}