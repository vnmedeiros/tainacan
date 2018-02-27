<?php

use Tainacan\Repositories;
use Tainacan\Entities;

/**
 * Represents the Collections REST Controller
 *
 * @uses Entities\Collection and Repositories\Collections
 * */
class TAINACAN_REST_Collections_Controller extends TAINACAN_REST_Controller {
    private $collections_repository;
    private $collection;

	/**
	 * TAINACAN_REST_Collections_Controller constructor.
	 * Define the namespace, rest base and instantiate your attributes.
	 */
	public function __construct(){
        $this->namespace = 'tainacan/v2';
        $this->rest_base = 'collections';

        add_action('rest_api_init', array($this, 'register_routes'));
        add_action('init', array(&$this, 'init_objects'), 11);
    }
    
    /**
     * Initialize objects after post_type register
     */
    public function init_objects() {
    	$this->collections_repository = new Repositories\Collections();
    	$this->collection = new Entities\Collection();
    }

	/**
	 * Register the collections route and their endpoints
	 */
	public function register_routes(){
        register_rest_route($this->namespace, '/' . $this->rest_base, array(
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array($this, 'get_items'),
                'permission_callback' => array($this, 'get_items_permissions_check'),
	            //'args'                => $this->get_item_schema()
            ),
	        array(
		        'methods'             => WP_REST_Server::CREATABLE,
		        'callback'            => array($this, 'create_item'),
		        'permission_callback' => array($this, 'create_item_permissions_check'),
		        //'args'                => $this->get_endpoint_args_for_item_schema(WP_REST_Server::CREATABLE),
	        ),
        ));
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<collection_id>[\d]+)', array(
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array($this, 'get_item'),
                //'args'                => $this->get_collection_params(),
                'permission_callback' => array($this, 'get_item_permissions_check'),
            ),
            array(
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => array($this, 'update_item'),
                'permission_callback' => array($this, 'update_item_permissions_check'),
            ),
            array(
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => array($this, 'delete_item'),
                'permission_callback' => array($this, 'delete_item_permissions_check'),
            ),
        ));
    }

	/**
	 * Return a array of Collections objects in JSON
	 *
	 * @param WP_REST_Request $request
	 *
	 * @return WP_Error|WP_REST_Response
	 */
	public function get_items($request){
		$args = $this->prepare_filters($request);

        $collections = $this->collections_repository->fetch($args);

		$map = $this->collections_repository->get_map();


		$response = [];
		if($collections->have_posts()){
			while ($collections->have_posts()){
				$collections->the_post();

				$collection = new Entities\Collection($collections->post);

				array_push($response, $this->get_only_needed_attributes($collection, $map, $request['context']));
			}

			wp_reset_postdata();
		}

		$total_collections  = $collections->found_posts;
		$max_pages = ceil($total_collections / (int) $collections->query_vars['posts_per_page']);

        $rest_response = new WP_REST_Response($response, 200);

        $rest_response->header('X-WP-Total', (int) $total_collections);
        $rest_response->header('X-WP-TotalPages', (int) $max_pages);

        return $rest_response;
    }

	/**
	 * Return a Collection object in JSON
	 *
	 * @param WP_REST_Request $request
	 *
	 * @return WP_Error|WP_REST_Response
	 */
	public function get_item($request){
        $collection_id = $request['collection_id'];
        $collection = $this->collections_repository->fetch($collection_id);

        $response = $this->prepare_item_for_response($collection, $request );

        return new WP_REST_Response($response, 200);
    }

	/**
	 *
	 * Receive a WP_Query or a Collection object and return both in JSON
	 *
	 * @param mixed $item
	 * @param WP_REST_Request $request
	 *
	 * @return mixed|string|void|WP_Error|WP_REST_Response
	 */
	public function prepare_item_for_response($item, $request){
        if(!empty($item)){
            $item_arr = $item->__toArray();

            if($request['context'] === 'edit'){
            	$item_arr['current_user_can_edit'] = $item->can_edit();
            }

            return $item_arr;
        }

        return $item;
    }

	/**
	 *
	 * @param WP_REST_Request $request
	 *
	 * @return bool|WP_Error
	 * @throws Exception
	 */
	public function get_items_permissions_check($request){
        
        if ( 'edit' === $request['context'] && ! current_user_can('edit_tainacan-collections') ) {
			return false;
		}

		return true;
	}

	/**
	 *
	 * @param WP_REST_Request $request
	 *
	 * @return bool|WP_Error
	 * @throws Exception
	 */
	public function  get_item_permissions_check($request){
		$collection = $this->collections_repository->fetch($request['collection_id']);

		if(($collection instanceof Entities\Collection)) {
			if('edit' === $request['context'] && !$collection->can_read()) {
				return false;
			}

			return true;
		}

		return false;
	}

	/**
	 * Receive a JSON with the structure of a Collection and return, in case of success insert
	 * a Collection object in JSON
	 *
	 * @param WP_REST_Request $request
	 *
	 * @return array|WP_Error|WP_REST_Response
	 */
	public function create_item( $request ) {
		$body = json_decode($request->get_body(), true);

		if(empty($body)){
			return new WP_REST_Response([
				'error_message' => __('Body can not be empty.', 'tainacan'),
				'collection'    => $body
			], 400);
		}

		try {
			$prepared_post = $this->prepare_item_for_database( $body );
		} catch (\Error $exception){
			return new WP_REST_Response($exception->getMessage(), 400);
		}

        if($prepared_post->validate()) {
	        $collection = $this->collections_repository->insert( $prepared_post );

	        $response = $this->prepare_item_for_response($collection, $request);

	        return new WP_REST_Response($response, 201);
        }

        return new WP_REST_Response([
        	'error_message' => __('One or more values are invalid.', 'tainacan'),
	        'errors'        => $prepared_post->get_errors(),
	        'collection'    => $this->prepare_item_for_response($prepared_post, $request)
        ], 400);
    }

	/**
	 * Verify if current has permission to create a item
	 *
	 * @param WP_REST_Request $request
	 *
	 * @return bool|WP_Error
	 * @throws Exception
	 */
	public function create_item_permissions_check( $request ) {
		return $this->collections_repository->can_edit($this->collection);
    }

	/**
	 * Prepare collection for insertion on database
	 *
	 * @param WP_REST_Request $request
	 *
	 * @return object|Entities\Collection|WP_Error
	 */
	public function prepare_item_for_database( $request ) {

		foreach ($request as $key => $value){
			$set_ = 'set_' . $key;
			$this->collection->$set_($value);
		}

        return $this->collection;
    }

	/**
	 * Delete a collection
	 *
	 * @param WP_REST_Request $request
	 *
	 * @return string|WP_Error|WP_REST_Response
	 */
	public function delete_item( $request ) {
	    $collection_id = $request['collection_id'];
		$is_permanently = json_decode($request->get_body(), true);

		$args = [$collection_id, $is_permanently];

		$collection = $this->collections_repository->delete($args);

		$prepared_collection = $this->prepare_item_for_response($collection, $request);

		return new WP_REST_Response($prepared_collection, 200);
    }

	/**
	 * Verify if current user has permission to delete a collection
	 *
	 * @param WP_REST_Request $request
	 *
	 * @return bool|WP_Error
	 * @throws Exception
	 */
	public function delete_item_permissions_check( $request ) {
		$collection = $this->collections_repository->fetch($request['collection_id']);

		if($collection instanceof Entities\Collection) {
			return $collection->can_delete();
		}

		return false;
    }

	/**
	 * Update a collection
	 *
	 * @param WP_REST_Request $request
	 *
	 * @return string|WP_Error|WP_REST_Response
	 */
	public function update_item( $request ) {
	    $collection_id = $request['collection_id'];

	    $body = json_decode($request->get_body(), true);

	    if(!empty($body)){
	    	$attributes = [];

	    	foreach ($body as $att => $value){
	    		$attributes[$att] = $value;
		    }

		    $collection = $this->collections_repository->fetch($collection_id);

	    	if($collection) {
			    $prepared_collection = $this->prepare_item_for_updating( $collection, $attributes );

			    if ( $prepared_collection->validate() ) {
				    $updated_collection = $this->collections_repository->update( $collection );

				    $response = $this->prepare_item_for_response($updated_collection, $request);

				    return new WP_REST_Response( $response, 200 );
			    }

			    return new WP_REST_Response([
				    'error_message' => __('One or more values are invalid.', 'tainacan'),
				    'errors'        => $prepared_collection->get_errors(),
				    'collection'    => $this->prepare_item_for_response($prepared_collection, $request)
			    ], 400);
		    }

		    return new WP_REST_Response([
		    	'error_message' => __('Collection with that ID not found', 'tainacan' ),
			    'collection_id' => $collection_id
		    ], 400);
	    }

	    return new WP_REST_Response([
	    	'error_message' => __('The body could not be empty', 'tainacan'),
		    'body'          => $body
	    ], 400);
    }


	/**
	 * Verify if current user has permission to update a item
	 *
	 * @param WP_REST_Request $request
	 *
	 * @return bool|WP_Error
	 * @throws Exception
	 */
	public function update_item_permissions_check( $request ) {
		$collection = $this->collections_repository->fetch($request['collection_id']);

		if($collection instanceof Entities\Collection) {
			return $collection->can_edit();
		}

		return false;
    }

	/**
	 * @param string $method
	 *
	 * @return array|mixed|void
	 */
	public function get_endpoint_args_for_item_schema( $method = WP_REST_Server::CREATABLE ) {
	    $args = [
	    	'Object' => [
	    		'type'        => 'JSON',
			    'description' => 'A Collection object'
		    ]
	    ];

	    return $args;
    }

	/**
	 * @return array|mixed|void
	 */
	public function get_item_schema() {
		$args = $this->collections_repository->get_map();

		return $args;
    }
}

?>
