<?php
/*
Plugin Name: Node Image Compressor
Description: Compress images using your Node.js server via ngrok.
Version: 1.2
Author: Yousuf || Extroz.Studio
*/

// Register admin menu for plugin settings
add_action('admin_menu', function() {
    add_menu_page(
        'Node Image Compressor',      // Page title
        'Node Image Compressor',      // Menu title
        'manage_options',             // Capability
        'nic-settings',               // Menu slug
        'nic_settings_page',          // Callback function
        'dashicons-images-alt2',      // Icon
        81                            // Position
    );
});

// Settings page HTML
function nic_settings_page() {
    if (isset($_POST['nic_node_url'])) {
        update_option('nic_node_url', sanitize_text_field($_POST['nic_node_url']));
        echo '<div class="updated"><p>Settings saved.</p></div>';
    }

    $current_url = get_option('nic_node_url', 'https://unadmiring-heriberto-primordially.ngrok-free.dev');
    ?>
    <div class="wrap">
        <h1>Node Image Compressor Settings</h1>
        <form method="POST">
            <table class="form-table">
                <tr>
                    <th scope="row">Node.js Server URL</th>
                    <td>
                        <input type="text" name="nic_node_url" value="<?php echo esc_attr($current_url); ?>" size="50" />
                        <p class="description">Enter the full URL of your Node.js server (e.g., https://yourserver.com)</p>
                    </td>
                </tr>
            </table>
            <?php submit_button('Save Settings'); ?>
        </form>
    </div>
    <?php
}

// Send image to Node.js server
function nic_send_image_to_nodejs($file_path, $base_url) {
    $api_url = rtrim($base_url, '/') . "/api/upload";

    $cfile = new CURLFile($file_path, mime_content_type($file_path), basename($file_path));
    $post = ['image' => $cfile];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $api_url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);

    if (curl_errno($ch)) { 
        error_log('Curl error: ' . curl_error($ch)); 
        return false;
    }

    curl_close($ch);
    return json_decode($response, true);
}

// Hook into WordPress image upload
add_action('add_attachment', function($post_ID) {
    $file_path = get_attached_file($post_ID);
    if (!$file_path) return;

    // Get Node.js URL from settings
    $node_base_url = get_option('nic_node_url', 'https://unadmiring-heriberto-primordially.ngrok-free.dev');

    $result = nic_send_image_to_nodejs($file_path, $node_base_url);
    if (!$result) return;

    // Replace original image with compressed version if available
    if (!empty($result['processedFiles'][0]['originalExtCompressFile']['url'])) {
        $processed_file_url = $result['processedFiles'][0]['originalExtCompressFile']['url'];
        $full_url = rtrim($node_base_url, '/') . '/' . ltrim($processed_file_url, '/');

        $compressed_data = @file_get_contents($full_url);
        if ($compressed_data !== false) {
            file_put_contents($file_path, $compressed_data);
        } else {
            error_log("Failed to download compressed image from Node.js server: $full_url");
        }
    }
});
?>