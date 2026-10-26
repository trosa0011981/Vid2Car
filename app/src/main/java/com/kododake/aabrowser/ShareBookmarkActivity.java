package com.kododake.aabrowser;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * Receives shared text/URLs from Android Share Sheet and forwards them into MainActivity
 * so they open inside AA Browser without launching external apps.
 */
public class ShareBookmarkActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent incoming = getIntent();
        if (incoming != null && Intent.ACTION_SEND.equals(incoming.getAction())) {
            String sharedText = incoming.getStringExtra(Intent.EXTRA_TEXT);
            Intent launchMain = new Intent(this, MainActivity.class);
            launchMain.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            if (sharedText != null) {
                launchMain.putExtra("shared_url", sharedText);
            }
            startActivity(launchMain);
        }
        finish();
    }
}
