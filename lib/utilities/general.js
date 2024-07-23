
/**
 * Like filter, but distinguishing both succeeding and failing items.  
 * Apply callback to all elements of an iterable collection, placing
 * those where the filter succeeds into a list in the `succeeding` property,
 * and placing those where the filter fails into a list in the `failing` property.
 * @param  {Iterable<T>} items The collection we are partitioning.
 * @param  {(T, number, Iterable<T>) => Boolean } filter The function that separates items.
 * @return {{succeeding: Array<T>, failing: Array<T>}}
 */
export default function partition ( items, filter ) {
    const success = [];
    const fail    = [];
    items.forEach((value, i) => {
        if ( filter(value, i, items) ){
            success.push(value)
        } else {
            fail.push(value)
        }
    });
    return {
        succeeding : success,
        failing    : fail
    }
}