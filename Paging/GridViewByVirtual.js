/**
 * Created by TH on 2018-04-03.
 */

import React from 'react';
const electron_flux = require('electron_flux');
import { AutoSizer, Grid } from 'react-virtualized';

// let widthSize = 0;// 해당 윈도우의 width를 저장


export default class GridViewByVirtual extends React.Component {
    constructor(props) {
        super(props);

        try {

            this.gridItemsMap = this.props.gridItemsMap;

            this.page = 0;
            this.totalListNum = 0;  //하단으로 내려가며 gridcell의 개수를 체크할때 쓰이는 변수. 현재 보이는 화면과 상관없이 0페이지 첫 채팅부터 가장 상단 페이지 첫번째 채팅까지의 총 갯수. '총' 갯수이다.
            this.reverseListNum = 0; // 상단으로 올라가며 gridcell의 개수를 체크할때 쓰이는 변수
            this.previousActionUpOrDown = 'up';  //스크롤 이전 동작을 추적하여 올리다 내리는건지, 올리다 올리는건지, 내리다 올리는건지, 내리다 내리는건지 구분
            this.pagingDown = true; //현재 동작이 내리는 동작인지 구분
            this.refreshWithSamePageTimestamp = this.props.refreshWithSamePageTimestamp;
            this.downPageChange = false;
            this.rowsPerPage = this.props.rowsPerPage;
            this.rowsPerSubPage = this.props.rowsPerSubPage;

            this.keyArr = [];

            this.firstGridItem = {} // 가장 처음에 있는 grid 아이템 
            this.finalGridItem = {} // 가장 끝에 있는 grid 아이템 
            this.firstLoaded = true;  // 최초 Grid가 마운트 된 이후를 구분하려고
            this.originalListFromDB = undefined; //DB에 그떄그때 List의 아이템들을 집어넣음
            this.firstUppaging = true;

            this.additionalLoadingEventIsOnTransaction = false;
            this.scrollGapWithTop = 0; 
            this.widthSize = 0;
            this.textforkey = this.props.textforkey // key로 cell들을 구분하기 위해서 넣어주는 props
            this.newFocusedItem = 'none'; // 페이지 이동후 포커스 잡아줄 아이템
            this.SamePosition = false; // 리랜더링시 같은 위치인지 아닌지를 잡아 줄 아이템
            this.onSectionRenderedCompleted = false;
            this.checkScrollStatus = this.props.checkScrollStatus;
            this.pageLoadingCompo = this.props.pageLoadingCompo ? this.props.pageLoadingCompo : <div>pageLoadingCompo</div>;
            this.timingOn = false;

            this.additionalInfoObj = this.props.additionalInfoObj;
            console.log(this.additionalInfoObj)

            this.scrollToColumn = undefined; // scroll 위치 지정을 위한 셀 번호
            this.scrollToRow = undefined; // scrooll 위치 지정을 위한 줄 번호 

            this.basicStyle = {
                height: "20px",
            }

            this.state = {
                gridComponentList: [],
                scrollToAlignmentOption: 'end',  //scroll_toRow 통해 포커스된 아이템의 화면 위치. 혹은 첫 마운트된 리스트 목록의 포커스 화면 위치.
                pageLoading: false, // 페이지가 전환될때 로딩 이미지 표시

            }
            console.log("GridViewByVirtual this.props : ", this.props)
        } catch (err) {
            console.error('GridViewByVirtual.js constructor - ', err); // console.error('스크립트명 함수명 - 콘솔 내용);
        }
    }

    componentDidMount() {
        this.getDefaultGroupListArrAndState();
    }

    componentWillUnmount() {

    }

    componentDidUpdate() {
        console.log('GridViewByVirtual.js componentDidUpdate ');
        if (this.firstLoaded) {
            if (this.originalListFromDB !== undefined) {
                this.firstLoaded = false;
            }
        } else {
            // 여기선 상단 스크롤에 대해서만 처리해준다. 하단 스크롤은 cellrenderer에서 처리.
            if (this.newFocusedItem !== 'none' && this.pagingDown === false) {
                this.scrollToPosition(this.newFocusedItem);
                this.newFocusedItem = 'none';
                setTimeout(() => {
                    this.additionalLoadingEventIsOnTransaction = false;
                }, 100);
            }
        }
    }

    componentWillReceiveProps(nextProps){
        console.log("nextprops Timestamp",nextProps.refreshWithSamePageTimestamp);
        console.log("this.props Timestamp",this.props.refreshWithSamePageTimestamp);
        console.log("this Timestamp",this.refreshWithSamePageTimestamp);
        
        if(nextProps.refreshWithSamePageTimestamp > this.refreshWithSamePageTimestamp){
            console.log('GridViewByVirtual.js componentWillReceiveProps 페이징 유지하며 그룹리스트 리프레쉬 해야 함.');
            this.getSameRangeGroupListArrAndSetState();
        }

        if(nextProps.scrollGapToTop === this.scrollGapWithTop){
            console.log(nextProps.scrollGapToTop, this.scrollGapWithTop)
            this.SamePosition = true; 
        }
    }

    getDefaultGroupListArrAndState() {
        this.props.getLaterGroupListWithRange(this.rowsPerSubPage, 0).then((result) => {
            if (result.length !== 0) {
                // 그룹이 하나라도 있을 경우
                console.log("getDefaultGroupListArr", result);
                var tempgridCompnentList = this.createGridCompArr(result);
                this.firstGridItem = result[0];

                console.log("getDefaultGroupListArr this.firstGridItem", this.firstGridItem);
                this.page = 0;
                this.originalListFromDB = result;
                this.totalListNum = this.rowsPerSubPage // 초기 리스트의 총 갯수는 subPage의 갯수랑 같음
                this.previousActionUpOrDown = "down" // 초기 움직임은 up이 될 수 없다 위에서 아래로 내려가는게 기본 동작이기 때문            

                this.checkScrollStatus(false);
                this.setState({
                    gridComponentList: tempgridCompnentList,
                    scrollToAlignmentOption: 'end',
                    pageLoading: false,
                })
            } else {
                // 그룹이 하나도 없을 경우 여기다 소스를 넣으면 됨.
            }
        })
    }

    getLaterGroupListArrAndState() { /// 스크롤이 아래로 내려가는 모든 경우

        console.log('GridViewByVirtual.js getLaterGroupListArrAndState 발생중');

        this.pagingDown = true;
        this.firstUppaging = true;

        var minusOption = Math.floor(this.widthSize / this.props.cellWidth);

        var scrollToAlignmentOption;

        if (this.previousActionUpOrDown === 'down') {
            // down -> down 인데 페이지 전환
            if (this.totalListNum % this.rowsPerPage === 0) {
                console.log("dowm -> down 페이지 전환 발생");
                this.downPageChange = true;
                this.page = this.page + 1;
                this.totalListNum = this.totalListNum + this.rowsPerSubPage;
                var offset = this.page * this.rowsPerPage;
                scrollToAlignmentOption = 'start';

                this.setState({
                    pageLoading: true,
                })

            } else {
                // down -> down 일반 상황
                console.log("down -> down 페이지 전환 미발생");
                this.downPageChange = false;
                this.page = Math.floor(this.totalListNum / this.rowsPerPage);
                this.totalListNum = this.totalListNum + this.rowsPerSubPage;
                var offset = this.page * this.rowsPerPage;
                scrollToAlignmentOption = 'end';
                this.additionalLoadingEventIsOnTransaction = true;
            }
        } else {
            // up -> down 으로 페이지 전환
            this.downPageChange = true;
            this.page = this.page + 1;
            this.totalListNum = this.totalListNum + this.rowsPerSubPage;
            var offset = this.page * this.rowsPerPage;
            this.previousActionUpOrDown = 'down'
            scrollToAlignmentOption = 'start';
            this.scrollToColumn = 0; // this.에서 제대로 값을 변환시키는 타이밍을 못 잡아 주기 떄문에 억지로 변환
            this.scrollToRow = 0;

            this.setState({
                pageLoading: true
            });
        }

        this.props.getLaterGroupListWithRange(this.totalListNum - offset, offset).then((result) => {
            if ((result.length % this.rowsPerSubPage) !== 0) {
                this.newFocusedItem = result.length % this.rowsPerSubPage - minusOption;
                this.finalGridItem = result[result.length - 1];
                console.log('하단의 남은 데이터는 짜투리다. 이동 열은 this.newFocusedItem: ', this.newFocusedItem);
                //만약 페이지 전환 상황이었다면 추가로딩 상황으로 바꿔주자
                if (this.downPageChange) {
                    this.page = this.page - 1;
                    this.downPageChange = false;
                    scrollToAlignmentOption = "end";

                    for (let i = 0; i < result.length; i++) {
                        this.originalListFromDB.push(result[i])
                    }

                    this.newFocusedItem = this.totalListNum - minusOption;
                    result = this.originalListFromDB;
                } else {
                    this.newFocusedItem = this.totalListNum - minusOption;
                    this.originalListFromDB = result;
                }
            } else {
                this.newFocusedItem = this.totalListNum % this.rowsPerPage - minusOption;
                if(this.SamePosition){
                    this.newFocusedItem = 'none';
                }
                this.originalListFromDB = result;
                console.log('페이지 이어보기 이동 열은 this.newFocusedItem: ', this.newFocusedItem);
            } 


            var gridComponentList = this.createGridCompArr(result);
            this.additionalLoadingEventIsOnTransaction = true;
            this.setState({
                gridComponentList: gridComponentList,
                scrollToAlignmentOption: scrollToAlignmentOption,
                pageLoading: false,
            });

            console.log('GridViewByVirtual.js 추적 포인트 getLaterGroupListWithRange after setState');
        }).catch((err) => {

            console.log('GridViewByVirtual.js 추적 포인트 getLaterGroupListWithRange error', err);

        })
    }

    getPreviousGroupListArrAndState() { // 스크롤이 위로 올라가는 모든 경우

        console.log('GridViewByVirtual.js getPreviousGroupListArrAndState 발생중');

        this.pagingDown = false;
        var scrollToAlignmentOption;
        this.additionalLoadingEventIsOnTransaction = true;
        var minusOption = Math.floor(this.widthSize / this.props.cellWidth);

        if (this.previousActionUpOrDown === 'down') {
            // down -> up 이고, 페이지 전환 발생
            this.page = this.page - 1;
            this.totalListNum = (this.page + 1) * this.rowsPerPage;
            this.reverseListNum = this.rowsPerSubPage;
            this.previousActionUpOrDown = 'up';

            scrollToAlignmentOption = 'end';

            this.setState({
                pageLoading: true,
            })
        } else {
            if (this.reverseListNum < this.rowsPerPage) {
                // up -> up 이고 , 페이지 전환 x 
                // 가지고 있는 리스트의 갯수가 총 페이지에 해당하는 갯수보다 적어서 간단한 불러오기만 일어남
                this.reverseListNum = this.reverseListNum + this.rowsPerSubPage;
                scrollToAlignmentOption = 'start';
                this.firstUppaging = false;

            } else {
                // up -> up 이고, 페이지 전환 있음
                this.page = this.page - 1;
                this.totalListNum = (this.page + 1) * this.rowsPerPage;
                this.reverseListNum = this.rowsPerSubPage;
                scrollToAlignmentOption = 'end';

                this.setState({
                    pageLoading: true,
                })
            }
        }

        var offset = this.totalListNum - this.reverseListNum;
        if (this.firstUppaging) {
            this.newFocusedItem = this.reverseListNum % this.rowsPerPage - minusOption;
        } else {
            this.newFocusedItem = this.reverseListNum - this.rowsPerSubPage - minusOption;
        }
        this.props.getPreviousGroupListWithRange(this.reverseListNum, offset).then((result) => {
            var gridComponentList = this.createGridCompArr(result);

            this.originalListFromDB = result;
            this.setState({
                gridComponentList: gridComponentList,
                scrollToAlignmentOption: scrollToAlignmentOption,
                pageLoading: false
            });
        }).catch((err) => {
            console.log('GridViewByVirtual.js getPreviousGroupListArrAndState  error : ', err);
        })
    }

    getSameRangeGroupListArrAndSetState(){
        console.log('GridViewByVirtual.js - getSameRangeChatsAndSetState 실행 - ');

        var range = this.totalListNum - this.page * this.rowsPerPage;
        var offset = this.page * this.rowsPerPage ; 

        console.log("getSameRangeGroupListArrAndSetState",range, offset);
        this.props.getSameRangeGroupList(range, offset).then( (results) => {
            console.log('GridViewByVirtual.js - getSameRangeGroupListArrAndSetState getSameRangeGroupList 결과 : ', results);

            var gridComponentList = this.createGridCompArr(results);    
            this.originalListFromDB = results;
            
            this.setState({
                gridComponentList : gridComponentList
            });
        }).catch( (err) => {
            console.log('GridViewByVirtual.js - getSameRangeGroupListArrAndSetState Fail - ', err);
        });

    }

    createGridCompArr(result) {
        console.log("createGridCompArr result : ", result);
        let tempgridComponentList = [];
        this.keyArr = [];

        for (let i = 0; i < result.length; i++) {
            var GridComp = this.gridItemsMap.get(this.props.keyword);
            var gridData = result[i];
            tempgridComponentList.push(
                <GridComp key={result[i][this.textforkey] + 'GridComp'} data={gridData} additionalInfoObj={this.additionalInfoObj} />
            );
            this.keyArr.push(result[i][this.textforkey]);
        }

        return tempgridComponentList;
    }

    cellRenderer({ columnIndex, key, rowIndex, style }) {
        let index = (Math.floor(this.widthSize / this.props.cellWidth) * rowIndex) + columnIndex;
        // let index  = (rowIndex + 1)
        // 현재 인덱스를 구해주려면 한 줄에 몇개가 들어가 있는지 알아야 하기 때문에 현재 윈도우의 사이즈를 가지고 있을 수 밖에 없음
        // console.log("grid Compnent by index : ",this.state.gridComponentList[index]);

        //페이지 하단 이어불러오기 
        if (this.newFocusedItem !== 'none' && this.onSectionRenderedCompleted && this.pagingDown && this.downPageChange === false) {

            if (style.top !== 0) {
                console.log('하단 이어 불러오기 newFocusedItem in if', this.newFocusedItem);
                this.scrollToPosition(this.newFocusedItem);
                this.newFocusedItem = 'none';
                setTimeout(() => {
                    this.additionalLoadingEventIsOnTransaction = false;
                    this.onSectionRenderedCompleted = false;
                }, 100);
            }
        }

        // 하단 새로운 페이지
        if (this.newFocusedItem !== 'none' && this.onSectionRenderedCompleted && this.pagingDown && this.downPageChange) {

            if (style.top !== 0) {

                console.log('하단 새로운 페이지 newFocusedItem', this.newFocusedItem);

                setTimeout(() => {
                    if (this.newFocusedItem === 'none') {
                        this.downPageChange = false;
                        this.additionalLoadingEventIsOnTransaction = false;
                        this.onSectionRenderedCompleted = false;
                        return
                    }
                    this.scrollToPosition(this.newFocusedItem);
                    this.downPageChange = false;
                    this.newFocusedItem = 'none';
                    this.additionalLoadingEventIsOnTransaction = false;
                    this.onSectionRenderedCompleted = false;
                }, 100);
            }
        }

        return (
            <div 
                key={key} 
                style={style}
            >
                {this.state.gridComponentList[index]}
            </div>
        )
    }

    getPageLoadingComponent() {
        let PageLoadingCompo = this.pageLoadingCompo
        return <PageLoadingCompo></PageLoadingCompo>
    }

    handle_scroll(event) {
        console.log("handle_scroll" ,this.additionalLoadingEventIsOnTransaction,  this.state.pageLoading);

        if (this.originalListFromDB === undefined) {
            // console.log('originalListFromDB : ', this.originalListFromDB);
            return
        }
        if (this.additionalLoadingEventIsOnTransaction || this.state.pageLoading) {
            return
        }
        
        console.log('GridViewByVirtual.js 추적 포인트 handle_scroll event');

        //상단으로 스크롤이 이동중이라면
        if (event.scrollTop <= 0 && this.SamePosition === false) {
            this.scrollGapWithTop = event.scrollTop; 
            if (this.originalListFromDB[0][this.props.textforkey] !== this.firstGridItem[this.props.textforkey]) {
                console.log("상단으로 스크롤이 이동중이라면", )
                this.getPreviousGroupListArrAndState();
            } else {
                console.log('이미 최상단 도달')
                this.checkScrollStatus(false);  //부모에게 최상단 이라고 알려주자.
                setTimeout(() => {
                    this.additionalLoadingEventIsOnTransaction = false;
                }, 100)
            }
        }

        //다시 하단으로 스크롤이 내려가는 중이라면
        if ((event.scrollHeight - (event.scrollTop + event.clientHeight) == 0) && this.SamePosition === false) {
            this.scrollGapWithTop = event.scrollTop; 
            if (this.originalListFromDB[this.originalListFromDB.length - 1][this.props.textforkey] !== this.finalGridItem[this.props.textforkey]) {
                console.log("GridViewByVirtual.js 추적 포인트 handle_scroll 아래로 스크롤 이동중:", this.originalListFromDB[this.originalListFromDB.length - 1][this.props.textforkey], this.finalGridItem[this.props.textforkey])
                this.getLaterGroupListArrAndState();
            } else {
                console.log('이미 최하단 도달 ')
                setTimeout(() => {
                    this.additionalLoadingEventIsOnTransaction = false;
                }, 100)
            }
        }
        
        this.SamePosition = false;
        
        this.checkScrollStatus(true,this.scrollGapWithTop);  //부모에게 스크롤 중이라고 알려주자.

    }

    onSectionRendered() {
        if (this.onSectionRenderedCompleted === false) {
            this.onSectionRenderedCompleted = true;
        }
    }

    scrollToPosition(cellIdx) {
        console.log("scrollToPosition", cellIdx);
        let rowIndex = cellIdx / Math.floor(this.widthSize / this.props.cellWidth);
        let columnIndex = cellIdx / rowIndex;
        this.scrollToColumn = columnIndex;
        this.scrollToRow = rowIndex;
    }

    render() {
        console.log("GridViewByVirtual render in this.state.gridComponentList.length : ", this.state.gridComponentList.length);
        console.log("GridViewByVirtual render in this.state.gridComponentList.length : ", Math.ceil(this.state.gridComponentList.length / Math.floor(this.widthSize / this.props.cellWidth)));

        try {
            return (
                <div className={"GridViewByVirtual " + this.props.class}>
                    {this.state.pageLoading
                        ? this.getPageLoadingComponent()
                        : <AutoSizer>
                            {({ width, height }) => {
                                this.widthSize = width
                                return (
                                    <Grid
                                        cellRenderer={this.cellRenderer.bind(this)}
                                        width={width}
                                        height={height}
                                        columnWidth={this.props.cellWidth}
                                        rowHeight={this.props.cellHeight}
                                        columnCount={Math.floor(width / this.props.cellWidth)}
                                        rowCount={Math.ceil(this.state.gridComponentList.length / Math.floor(width / this.props.cellWidth))}
                                        onSectionRendered={this.onSectionRendered.bind(this)}
                                        onScroll={this.handle_scroll.bind(this)}
                                        scrollToColumn={this.scrollToColumn}
                                        scrollToRow={this.scrollToRow}
                                        scrollToAlignment={this.state.scrollToAlignmentOption}
                                    />
                                )
                            }}
                        </AutoSizer>
                    }
                </div>

            );
        } catch (err) {
            console.error('GridViewByVirtual.js render - ', err); // console.log('스크립트명 함수명 - 콘솔 내용);
            return null;
        }
    }
}