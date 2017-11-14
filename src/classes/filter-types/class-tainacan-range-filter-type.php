<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class TainacanFieldType
 */
class Tainacan_Range_Filter_Type extends Tainacan_Filter_Type {

    function __construct(){
        $this->supported_types = ['float','date'];
    }

    /**
     * @param $metadata
     * @return string
     */

    function render( $filter ){
        return '<tainacan-filter-range name="'.$filter->get_name().'"></tainacan-filter-range>';
    }
}